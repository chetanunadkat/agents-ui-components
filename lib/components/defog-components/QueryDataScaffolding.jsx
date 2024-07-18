import { useContext, useEffect, useState } from "react";
import {
  SpinningLoader,
  MessageManagerContext,
  DropFilesHeadless,
} from "../../ui-components/lib/main";
import { parseCsvFile } from "../utils/utils";
import { twMerge } from "tailwind-merge";
import { ArrowDownTrayIcon } from "@heroicons/react/20/solid";

/**
 * This is a scaffolding component
 * which allows us to have db selections and file upload buttons on top
 * the actual content inside of this component should be rendered as children of this component
 * for eg:
 * ```
 * <QueryDataStandalone {...props}>
 *   <Content>
 * </QueryDataStandalone>
 * ```
 */
export function QueryDataScaffolding({
  keyName,
  token,
  rootClassNames = (selectedDb) => "",
  apiEndpoint = null,
  availableDbs = [],
  defaultSelectedDb = null,
  allowUploadFile = true,
  onDbChange = (...args) => {},
  onFileUploadSuccess = (...args) => {},
  children = null,
}) {
  const [selectedDb, setSelectedDb] = useState(defaultSelectedDb);
  const [parsingFile, setParsingFile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dropping, setDropping] = useState(false);
  const messageManager = useContext(MessageManagerContext);

  const uploadFileToServer = async ({ file, parsedData, rows, columns }) => {
    try {
      const response = await fetch(`${apiEndpoint}/integration/upload_csv`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: parsedData,
          keyName: keyName,
          token: token,
        }),
      });
      const data = await response.json();
      console.log(data);

      if (data.status !== "success") {
        throw new Error("Failed to upload the file");
      }
      onFileUploadSuccess({ file, parsedData, columns, rows });
    } catch (e) {
      messageManager.error("Failed to upload the file");
      console.log(e.stack);
    } finally {
      setParsingFile(false);
      setLoading(false);
    }
  };

  return (
    <div
      className={twMerge(
        "w-full h-full p-2",
        typeof rootClassNames === "function" ? rootClassNames(selectedDb) : ""
      )}
    >
      <div className="w-full relative mb-4 text-gray-500 text-xs">
        <div className="w-16 font-bold sm:absolute z-10 left-0 whitespace-nowrap py-2">
          Dataset:
        </div>
        <div className="sm:pl-16 overflow-scroll flex flex-row gap-2 items-center rounded-md">
          {availableDbs.map((db, i) => {
            return (
              <span
                key={db + "-" + i}
                onClick={() => {
                  setSelectedDb(db);
                  onDbChange(db);
                }}
                className={twMerge(
                  "p-2 bg-gray-200 border border-gray-300 rounded-full cursor-pointer",
                  selectedDb === db
                    ? "bg-gray-600 border-transparent text-white"
                    : "hover:bg-gray-300"
                )}
              >
                {db}
              </span>
            );
          })}

          {allowUploadFile && (
            <DropFilesHeadless
              rootClassNames="flex items-center cursor-pointer group ml-auto self-end"
              disabled={loading}
              onDragEnter={(ev) => {
                ev.preventDefault();
                ev.stopPropagation();

                setDropping(true);

                console.log(ev.target);
              }}
              onDragLeave={(ev) => {
                ev.preventDefault();
                ev.stopPropagation();

                setDropping(false);
              }}
              onFileSelect={(ev) => {
                // this is when the user selects a file from the file dialog
                try {
                  let file = ev.target.files[0];
                  if (!file || file.type !== "text/csv") {
                    throw new Error("Only CSV files are accepted");
                  }
                  setLoading(true);
                  setParsingFile(true);

                  parseCsvFile(file, uploadFileToServer);
                } catch (e) {
                  messageManager.error("Failed to parse the file");
                  setLoading(false);
                  setParsingFile(false);
                }
              }}
              onDrop={(ev) => {
                ev.preventDefault();
                try {
                  let file = ev?.dataTransfer?.items?.[0];
                  if (
                    !file ||
                    !file.kind ||
                    file.kind !== "file" ||
                    file.type !== "text/csv"
                  ) {
                    throw new Error("Only CSV files are accepted");
                  }

                  file = file.getAsFile();

                  setLoading(true);
                  setParsingFile(true);

                  parseCsvFile(file, uploadFileToServer);
                } catch (e) {
                  messageManager.error("Failed to parse the file");
                  console.log(e.stack);
                  setLoading(false);
                  setParsingFile(false);
                }
              }}
            >
              <span
                className={twMerge(
                  "rounded-full bg-secondary-highlight-1/40 text-white p-2 group-hover:bg-secondary-highlight-1 group-hover:text-white cursor-pointer flex items-center whitespace-nowrap"
                )}
              >
                {parsingFile ? (
                  <>
                    Uploading
                    <SpinningLoader classNames="h-4 w-4 inline m-0 ml-2" />
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">
                      {dropping ? "Drop here!" : "Upload / Drop a CSV"}
                    </span>
                    <span className="inline sm:hidden">Upload a CSV</span>
                    <ArrowDownTrayIcon className="h-4 w-4 inline ml-1" />
                  </>
                )}
              </span>
            </DropFilesHeadless>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
