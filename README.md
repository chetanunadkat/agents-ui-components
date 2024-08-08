# agents-ui-components

## Quickstart

### Usage

Use the `DefogAnalysisAgentEmbed` component like so:

```jsx
import { DefogAnalysisAgentEmbed } from "@defogdotai/agents-ui-components/agent";
import "@defogdotai/agents-ui-components/css";

<DefogAnalysisAgentEmbed
  // The API endpoint to use for the requests. Default is https://demo.defog.ai.
  apiEndpoint={"API_ENDPOINT"}
  token={"HASHED_PASSWORD"}
  // questions that will be shown for new csvs uploaded
  uploadedCsvPredefinedQuestions={["Show me any 5 rows from the dataset"]}
  showAnalysisUnderstanding={true}
  dbs={[
    {
      keyName: "Manufacturing",
      name: "Manufacturing",
      predefinedQuestions: [
        "Show me any 5 rows from the dataset",
        "Show me any 40 rows from the dataset",
      ],
      isTemp: false,
      sqlOnly: false,
    },
    {
      keyName: "Sales",
      name: "Sales",
      predefinedQuestions: ["Show me any 5 rows from the dataset"],
      isTemp: false,
      sqlOnly: false,
    },
  ]}
  ... // other props
/>;
```

### Test things locally

First, do:

```
npm i
npm run dev
```

Now, create a `.env` file in your root directory with the following content, where `HASHED_PASSWORD` and `API_ENDPOINT` are replaced by actual values.

```
VITE_TOKEN="HASHED_PASSWORD?"
VITE_API_ENDPOINT="API_ENDPOINT"
```

To quickly see what the different form of our agents look like, run `npm run dev`.

Now open `http://localhost:5173/` in your browser

You will get several options. Pick and and play around. Corresponding code for all those pages is inside `test/` folder.

### Publishing to npm

First, create a build with `npm run build`. This will automatically create a `dist` folder.
Then, run `npm run publish`

### Viewing docs

Run `npm run storybook` to see detailed documentation.