import { useState } from "react";
import {
  AgentConfigContext,
  createAgentConfig,
  AnalysisTreeViewer,
} from "../../lib/agent";

export default {
  title: "Agents/AnalysisTreeViewer",
  component: AnalysisTreeViewer,
  parameters: {
    layout: "fullscreen",
    actions: {
      handles: ["click"],
    },
    docs: {
      description: {
        component:
          "Analysis viewer component. This needs to be used with AgentContext to work. See examples below.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {},
  render: (args) => {
    const agentConfig = createAgentConfig({
      apiEndpoint: "https://demo.defog.ai",
      isTemp: false,
      sqlOnly: false,
      token: "23ee021b82afa024bee3b52be4d5a2603a4d0056780dd99c93b0caf0c875ea77",
    });

    const [config, setConfig] = useState(agentConfig);
    return (
      <AgentConfigContext.Provider value={{ val: config, update: setConfig }}>
        <AnalysisTreeViewer {...args} />
      </AgentConfigContext.Provider>
    );
  },
};

export const Primary = {
  args: {
    predefinedQuestions: ["Show me 5 rows"],
  },
};
