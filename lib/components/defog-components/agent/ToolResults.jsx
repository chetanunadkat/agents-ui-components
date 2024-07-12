import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ToolResultsTable } from "../ToolResultsTable";
import { ToolRunError } from "./ToolRunError";
import { ToolRunInputList } from "./ToolRunInputList";
import { ToolRunOutputList } from "./ToolRunOutputList";
import { ToolReRun } from "./ToolReRun";
import AgentLoader from "../common/AgentLoader";
import LoadingLottie from "../svg/loader.json";
import ErrorBoundary from "../../common/ErrorBoundary";
import { csvParse } from "d3";
import { getToolRunData, parseData, toolDisplayNames } from "../../utils/utils";
import ToolRunAnalysis from "./ToolRunAnalysis";
import { AddStepUI } from "./AddStepUI";
import { Modal } from "antd";
import setupBaseUrl from "../../utils/setupBaseUrl";
import { ReactiveVariablesContext } from "../../context/ReactiveVariablesContext";

function parseOutputs(data, analysisData) {
  let parsedOutputs = {};
  // go through data and parse all tables
  Object.keys(data.outputs).forEach((k, i) => {
    parsedOutputs[k] = {};
    // check if this has data, reactive_vars and chart_images
    if (data.outputs[k].data) {
      parsedOutputs[k].data = parseData(data.outputs[k].data);
    }
    if (data.outputs[k].reactive_vars) {
      parsedOutputs[k].reactive_vars = data.outputs[k].reactive_vars;

      // check if title is defined
      if (!parsedOutputs[k]?.reactive_vars?.title) {
        Object.defineProperty(parsedOutputs[k].reactive_vars, "title", {
          get() {
            return analysisData?.user_question;
          },
        });
      }
    }
    if (data.outputs[k].chart_images) {
      parsedOutputs[k].chart_images = data.outputs[k].chart_images;
    }
    if (data.outputs[k].analysis) {
      parsedOutputs[k].analysis = data.outputs[k].analysis;
    }
  });
  return parsedOutputs;
}

const deleteStepsEndpoint = setupBaseUrl("http", "delete_steps");

export function ToolResults({
  analysisId,
  analysisData,
  activeNode,
  toolSocketManager = null,
  dag = null,
  setActiveNode = () => {},
  handleReRun = () => {},
  reRunningSteps = [],
  setPendingToolRunUpdates = (...args) => {},
  toolRunDataCache = {},
  setToolRunDataCache = (...args) => {},
  handleDeleteSteps = async (...args) => {},
  tools = {},
  analysisBusy = false,
}) {
  const [toolRunId, setToolRunId] = useState(null);
  const [toolRunData, setToolRunData] = useState(null);
  const [toolRunDataLoading, setToolRunDataLoading] = useState(false);
  const reactiveContext = useContext(ReactiveVariablesContext);
  const [edited, setEdited] = useState(false);

  const [parentNodeData, setParentNodeData] = useState({});

  const availableOutputNodes = useMemo(
    () => (dag && [...dag?.nodes()].filter((n) => !n.data.isTool)) || [],
    [dag]
  );

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  async function handleDelete(ev) {
    try {
      ev.preventDefault();
      ev.stopPropagation();
      // actually delete the steps

      const deleteToolRunIds = [...activeNode.descendants()]
        .filter((d) => d?.data?.isTool)
        .map((d) => d?.data?.step?.tool_run_id);

      await handleDeleteSteps(deleteToolRunIds);
    } catch (e) {
      console.log(e);
    } finally {
      handleCancel();
    }
  }

  function handleCancel(ev) {
    ev?.preventDefault();
    ev?.stopPropagation();
    setShowDeleteModal(false);
    // also find out all the descendants of this node
    // add a class to them to-be-deleted

    [...activeNode.descendants()].forEach((d) => {
      const id = d.data.id;
      const node = document.querySelector(`.graph-node.tool-run-${id}`);
      if (!node) return;

      // add a class highlighted
      node.classList.remove("to-be-deleted");
    });
  }

  function showModal(ev) {
    try {
      ev.preventDefault();
      ev.stopPropagation();
      setShowDeleteModal(true);
      // also find out all the descendants of this node
      // add a class to them to-be-deleted

      [...activeNode.descendants()].forEach((d) => {
        const id = d.data.id;
        // get the closest .analysis-content to the mouseovered element
        const closest = ev.target.closest(".analysis-content");
        if (!closest) return;
        // now get the closest .graph-node with the class name output
        const node = closest.querySelector(`.graph-node.tool-run-${id}`);
        if (!node) return;
        // add a class highlighted
        node.classList.add("to-be-deleted");
      });
    } catch (e) {
      console.log(e);
    }
  }

  const getNewData = useCallback(
    async (newId) => {
      if (!activeNode) return;
      setToolRunDataLoading(true);

      let res, newData;
      let hasCache = false;
      //   first find in context if available
      if (toolRunDataCache[newId]) {
        // use cache
        res = toolRunDataCache[newId];
        hasCache = true;
      } else {
        res = await getToolRunData(newId);
      }

      const newToolRunDataCache = { ...toolRunDataCache };

      if (res.success) {
        if (!hasCache) {
          // save to cache
          newToolRunDataCache[newId] = res;
        }

        // update reactive context
        Object.keys(res?.tool_run_data?.outputs || {}).forEach((k, i) => {
          if (!res?.tool_run_data?.outputs?.[k]?.reactive_vars) return;
          reactiveContext.update((prev) => {
            return {
              ...prev,
              [newId]: {
                ...prev[newId],
                [k]: res?.tool_run_data?.outputs?.[k]?.reactive_vars,
              },
            };
          });
        });

        // make life easier
        newData = res?.tool_run_data;

        newData.parsedOutputs = parseOutputs(newData, analysisData);
        // in case any of the inputs is a pd dataframe, we will also fetch those tool run's data

        const inputs = newData?.step?.inputs || [];

        let parentDfs = Array.from(
          Object.values(inputs).reduce((acc, input, i) => {
            let inp = input;
            // if input is a string, convert to array and do
            if (!Array.isArray(input)) {
              inp = [input];
            }

            inp.forEach((i) => {
              // if not a string don't do anything
              if (typeof i !== "string") return acc;

              let matches = [...i.matchAll(/(?:global_dict\.)(\w+)/g)];
              matches.forEach(([_, parent]) => {
                acc.add(parent);
              });
            });
            return acc;
          }, new Set())
        );

        // find nodes in the dag that have this output_storage_keys
        let parentNodes = availableOutputNodes.filter((n) => {
          return parentDfs.indexOf(n.data.id) > -1;
        });

        // get data for all these nodes using node.data.step.tool_run_id
        let parentIds = parentNodes.map((n) => n.data.step.tool_run_id);

        // get data for all these nodes
        let parentData = await Promise.all(
          parentIds.map((id) => {
            // try to get from cache
            if (toolRunDataCache[id]) {
              return toolRunDataCache[id];
            }
            return getToolRunData(id);
          })
        );

        // update toolRunDataCache
        parentData.forEach((d) => {
          if (d.success) {
            // parse outputs
            d.tool_run_data.parsedOutputs = parseOutputs(
              d.tool_run_data,
              analysisData
            );

            newToolRunDataCache[d.tool_run_data.tool_run_id] = d;
          }
        });

        setParentNodeData(
          parentData.reduce((acc, d) => {
            if (d.success) {
              acc[d.tool_run_data.tool_run_id] = d.tool_run_data;
            }
            return acc;
          }, {})
        );

        setToolRunId(newId);
        setToolRunData(newData);
        setEdited(newData.edited);
        setToolRunDataLoading(false);
      } else {
        setToolRunDataLoading(false);
        setToolRunData(res?.tool_run_data);
        if (!hasCache) {
          newToolRunDataCache[newId] = res;
        }

        // remove from reactive context
        reactiveContext.update((prev) => {
          const newContext = { ...prev };
          if (!newContext[newId]) return newContext;
          delete newContext[newId];
          return newContext;
        });
      }

      setToolRunDataCache((prev) => {
        return {
          ...prev,
          ...newToolRunDataCache,
        };
      });
    },
    [toolRunDataCache, reactiveContext, analysisData, activeNode]
  );

  function handleEdit({ analysis_id, tool_run_id, update_prop, new_val }) {
    if (!tool_run_id) return;
    if (!analysis_id) return;
    if (!update_prop) return;
    if (tool_run_id !== toolRunId) return;

    if (toolSocketManager && toolSocketManager.send) {
      // if sql, or code_str is present, they are in tool_run_details
      // update toolRunData and send to server
      toolSocketManager.send({
        analysis_id,
        tool_run_id,
        update_prop,
        new_val,
      });
      setEdited(true);
    }
    // edit this in the context too
    // but only do batch update when we click on another node
    // so we can prevent react rerendering
    setPendingToolRunUpdates((prev) => {
      return {
        [tool_run_id]: {
          ...prev[tool_run_id],
          [update_prop]: new_val,
        },
      };
    });
  }

  useEffect(() => {
    if (!activeNode) return;

    if (!activeNode.data.isAddStepNode) {
      async function getToolRun() {
        const toolRun = activeNode.data.isTool
          ? activeNode
          : [...activeNode?.parents()][0];
        const newId = toolRun?.data?.step?.tool_run_id;

        if (!toolRun?.data?.isTool) {
          console.error(
            "Something's wrong on clicking node. No tool parents found."
          );
          console.log("Node clicked: ", activeNode);
        }

        await getNewData(newId);
      }

      getToolRun();
    } else {
      async function getAvailableInputDfs() {
        // if is add step node, we still need parent step data
        const newToolRunDataCache = { ...toolRunDataCache };
        // this is a lot of DRY code, but it's okay for now
        let availableInputDfs = [];
        try {
          if (!activeNode || !activeNode.ancestors) availableInputDfs = [];

          availableInputDfs = [...dag.nodes()]
            .filter(
              (d) =>
                !d.data.isTool &&
                d.data.id !== activeNode.data.id &&
                !d.data.isError &&
                !d.data.isAddStepNode
            )
            .map((ancestor) => ancestor);
        } catch (e) {
          console.log(e);
          availableInputDfs = [];
        }

        let parentIds = availableInputDfs.map((n) => n.data.step.tool_run_id);

        // get data for all these nodes
        let parentData = await Promise.all(
          parentIds.map((id) => {
            // try to get from cache
            if (toolRunDataCache[id]) {
              return toolRunDataCache[id];
            }
            return getToolRunData(id);
          })
        );

        // update toolRunDataCache
        parentData.forEach((d) => {
          if (d.success) {
            // parse outputs
            d.tool_run_data.parsedOutputs = parseOutputs(
              d.tool_run_data,
              analysisData
            );

            newToolRunDataCache[d.tool_run_data.tool_run_id] = d;
          }
        });

        setParentNodeData(
          parentData.reduce((acc, d) => {
            // for each output add a key to acc
            if (d.success) {
              Object.keys(d.tool_run_data.parsedOutputs).forEach((k) => {
                acc[k] = d.tool_run_data.parsedOutputs[k];
              });
            }
            return acc;
          }, {})
        );
      }

      getAvailableInputDfs();
    }
  }, [activeNode, reRunningSteps]);

  const [displayLoadingOverlay, setDisplayLoadingOverlay] = useState(false);

  useEffect(() => {
    if (analysisBusy) {
      setDisplayLoadingOverlay(true);
    } else {
      setDisplayLoadingOverlay(false);
    }
  }, [analysisBusy]);

  // rerunningstepsis array of object: {tool_run_id: res.pre_tool_run_message,
  // timeout: funciton
  // clearTimeout: function}
  const isStepReRunning = useMemo(() => {
    return reRunningSteps.some((s) => s.tool_run_id === toolRunId);
  }, [reRunningSteps, toolRunId]);

  return !activeNode || !activeNode.data || !toolRunData ? (
    <></>
  ) : (
    <div
      className="tool-results-ctr w-full h-full"
      data-is-tool={activeNode.data.isTool}
    >
      {/* create a translucent overlay if displayLoadingOverlay is true */}
      {displayLoadingOverlay && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: 600,
            maxHeight: "100%",
            backgroundColor: "rgba(255, 255, 255, 0.6)",
            zIndex: 100,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: 24,
            color: "#000",
          }}
        >
          Continuing to execute the analysis and moving on to the next step...
          <br />
          Last executed step: {toolRunData?.tool_name}
        </div>
      )}

      {/* if analysis is busy */}
      {toolRunDataLoading || isStepReRunning ? (
        <div className="tool-run-loading">
          <AgentLoader
            message={
              toolRunDataLoading ? "Loading data..." : "Running analysis..."
            }
            lottieData={LoadingLottie}
          />
        </div>
      ) : activeNode && toolRunData && activeNode.data.isAddStepNode ? (
        <AddStepUI
          analysisId={analysisId}
          activeNode={activeNode}
          dag={dag}
          handleReRun={handleReRun}
          parentNodeData={parentNodeData}
          tools={tools}
        />
      ) : toolRunData?.error_message && !activeNode.data.isTool ? (
        <ToolRunError error_message={toolRunData?.error_message}></ToolRunError>
      ) : activeNode.data.isTool ? (
        <>
          <ErrorBoundary maybeOldAnalysis={true}>
            {toolRunData?.error_message && (
              <ToolRunError
                error_message={toolRunData?.error_message}
              ></ToolRunError>
            )}
            <div className="tool-action-buttons flex flex-row gap-2">
              {/* {edited && ( */}
              <ToolReRun
                className="font-mono bg-gray-50 border border-gray-200 text-gray-500 hover:bg-blue-500 hover:text-white"
                onClick={() => {
                  handleReRun(toolRunId);
                }}
              ></ToolReRun>
              {/* )} */}
              <ToolReRun
                onClick={showModal}
                text="Delete"
                className="font-mono bg-gray-50 border border-gray-200 text-gray-500 hover:bg-rose-500 hover:text-white"
              ></ToolReRun>
              <Modal
                okText={"Yes, delete"}
                okType="danger"
                title="Are you sure?"
                open={showDeleteModal}
                onOk={handleDelete}
                onCancel={handleCancel}
              >
                <p>
                  All child steps (highlighted in red) will also be deleted.
                </p>
              </Modal>
            </div>
            <h1 className="text-lg mt-4 mb-2">
              {toolDisplayNames[toolRunData.tool_name]}
            </h1>
            <div className="my-4">
              <h1 className="text-gray-400 mb-4">INPUTS</h1>
              <ToolRunInputList
                analysisId={analysisId}
                toolRunId={toolRunId}
                step={toolRunData.step}
                availableOutputNodes={availableOutputNodes}
                setActiveNode={setActiveNode}
                handleEdit={handleEdit}
                parentNodeData={parentNodeData}
              ></ToolRunInputList>
            </div>
            <div className="my-4">
              <h1 className="text-gray-400 mb-4">OUTPUTS</h1>
              <ToolRunOutputList
                analysisId={analysisId}
                toolRunId={toolRunId}
                step={toolRunData.step}
                codeStr={toolRunData?.tool_run_details?.code_str}
                sql={toolRunData?.tool_run_details?.sql}
                handleEdit={handleEdit}
                availableOutputNodes={availableOutputNodes}
                setActiveNode={setActiveNode}
              ></ToolRunOutputList>
            </div>
          </ErrorBoundary>
        </>
      ) : toolRunData?.parsedOutputs[activeNode.data.id] ? (
        <>
          <ToolResultsTable
            toolRunData={toolRunData}
            toolRunId={toolRunId}
            tableData={toolRunData?.parsedOutputs[activeNode.data.id]["data"]}
            chartImages={
              toolRunData?.parsedOutputs[activeNode.data.id]["chart_images"]
            }
            reactiveVars={
              toolRunData?.parsedOutputs[activeNode.data.id]["reactive_vars"]
            }
            nodeId={activeNode.data.id}
            analysisId={analysisId}
          />
          <div className="h-60 mt-2 rounded-md border overflow-scroll w-full">
            <div className="relative">
              <p className="font-bold m-0 sticky top-0 w-full p-2 bg-white shadow-sm border-b">
                Analysis
              </p>
              {toolRunData?.parsedOutputs[activeNode.data.id]["analysis"] ? (
                <p style={{ whiteSpace: "pre-wrap" }} className="text-xs">
                  {toolRunData?.parsedOutputs[activeNode.data.id]["analysis"]}
                </p>
              ) : (
                <ToolRunAnalysis
                  question={analysisData.user_question}
                  data_csv={toolRunData?.outputs[activeNode.data.id]["data"]}
                  image={
                    toolRunData?.parsedOutputs[activeNode.data.id][
                      "chart_images"
                    ]
                  }
                />
              )}
            </div>
          </div>
        </>
      ) : (
        <></>
      )}
    </div>
  );
}
