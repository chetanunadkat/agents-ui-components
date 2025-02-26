import React, { useEffect, useMemo, useState } from "react";
import { twMerge } from "tailwind-merge";
import { breakpoints } from "../hooks/useBreakPoint";
import { useWindowSize } from "../hooks/useWindowSize";
import { SingleSelect } from "./SingleSelect";

export type Tab = {
  /**
   * The name of the tab.
   */
  name: string;

  /**
   * The content of the tab.
   */
  content?: React.ReactNode;

  /**
   * Additional classes to be added to the tab content.
   */
  classNames?: string;

  /**
   * Additional classes to be added to the tab header.
   */
  headerClassNames?: string | Function;
};

interface TabsProps {
  tabs?: Array<Tab>;
  defaultSelected?: string;
  selected?: string;
  size?: "small" | "normal";
  rootClassNames?: string;
  defaultTabClassNames?: string;
  contentClassNames?: string;
  selectedTabHeaderClasses?: Function | string;
  vertical?: boolean;
  disableSingleSelect?: boolean;
}

/**
 * Tabs component
 * @param {TabsProps} props - The props for the component
 * @example
 * const tabs = [
 *   { name: 'Normal tab', content: <div>Content 3</div>},
 *   { name: 'Red background in tab content', content: <div>Content 1</div>, classNames: "bg-red-500" },
 *   { name: 'Blue header tab', content: <div>Content 2</div>, headerClassNames: "bg-blue-500" },
 * ];
 *
 * <Tabs tabs={tabs} defaultSelected="Normal tab" />
 * */
export function Tabs({
  tabs = [],
  defaultSelected = null,
  selected = null,
  size = "normal",
  rootClassNames = "",
  defaultTabClassNames = "",
  contentClassNames = "",
  selectedTabHeaderClasses = (...args) => "bg-primary-highlight",
  vertical = false,
  disableSingleSelect = false,
}: TabsProps) {
  const windowSize = useWindowSize();

  const showVerticalTabs = useMemo(() => {
    return vertical && !(disableSingleSelect && windowSize[0] < breakpoints.sm);
  }, [windowSize[0] < breakpoints.sm, vertical, disableSingleSelect]);

  const [selectedTab, setSelectedTab] = useState(
    (defaultSelected && tabs.find((tab) => tab.name === defaultSelected)) ||
      (selected && tabs.find((tab) => tab.name === selected)) ||
      tabs[0]
  );

  useEffect(() => {
    if (selected !== selectedTab.name) {
      const t = tabs.find((tab) => tab.name === selected);
      if (t) {
        setSelectedTab(t);
      }
    }
  }, [selected]);

  return (
    <div
      className={twMerge(
        "relative w-full h-full",
        showVerticalTabs
          ? "flex flex-col sm:flex sm:flex-row"
          : "flex flex-col",
        rootClassNames
      )}
    >
      <div
        role="tablist"
        className={twMerge(
          "tab-group",
          showVerticalTabs
            ? "sm:relative sm:left-0 origin-right z-10"
            : "flex flex-row"
        )}
      >
        {!disableSingleSelect && (
          <div className={"sm:hidden grow"}>
            {/* Use an "onChange" listener to redirect the user to the selected tab URL. */}
            <SingleSelect
              options={tabs.map((tab) => ({
                key: tab.name,
                label: tab.name,
                value: tab.name,
              }))}
              placeholder="Select a tab"
              rootClassNames="block w-full rounded-md border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200"
              value={selectedTab.name}
              allowCreateNewOption={false}
              onChange={(val) => {
                const t = tabs.find((tab) => tab.name === val);
                if (t) {
                  setSelectedTab(t);
                }
              }}
            />
          </div>
        )}
        <div
          className={twMerge(
            "max-w-full",
            size === "small" ? "" : "grow",
            disableSingleSelect ? "block" : "hidden sm:block"
          )}
        >
          <nav
            className={twMerge(
              "border isolate flex divide-gray-200 dark:divide-gray-700 shadow max-w-full overflow-auto",
              // size === "small"
              //   ? showVerticalTabs
              //     ? ""
              //     : "rounded-t-2xl"
              //   : "rounded-t-2xl",

              showVerticalTabs
                ? "divide-y flex flex-col rounded-r-none rounded-l-2xl"
                : "divide-x rounded-t-xl"
            )}
            aria-label="Tabs"
          >
            {tabs.map((tab, tabIdx) => (
              <div
                aria-roledescription="tab"
                role="tab"
                key={tab.name + "-" + tabIdx}
                className={twMerge(
                  "flex items-center justify-center cursor-pointer",
                  selectedTab.name === tab.name
                    ? "text-gray-900 dark:text-white"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300",
                  "group relative min-w-fit overflow-hidden flex-1 bg-white dark:bg-gray-800 text-center text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 focus:z-10",
                  showVerticalTabs
                    ? "px-2 py-4 min-h-28 max-h-32"
                    : "py-4 px-4",
                  size === "small"
                    ? showVerticalTabs
                      ? "py-2"
                      : "whitespace-nowrap !rounded-bl-none !rounded-br-none py-2"
                    : "",
                  tabIdx === 0
                    ? showVerticalTabs
                      ? "rounded-tl-2xl"
                      : "rounded-tl-2xl"
                    : "",
                  tabIdx === tabs.length - 1
                    ? showVerticalTabs
                      ? "rounded-bl-2xl"
                      : "rounded-tr-2xl"
                    : "",
                  typeof tab?.headerClassNames === "function"
                    ? tab?.headerClassNames?.(
                        selectedTab.name === tab.name,
                        tab
                      )
                    : tab?.headerClassNames
                )}
                onClick={() => {
                  setSelectedTab(tab);
                }}
                aria-current={
                  selectedTab.name === tab.name ? "page" : undefined
                }
              >
                <div
                  style={{
                    // @ts-ignore
                    writingMode: showVerticalTabs ? "tb-rl" : "",
                    transform: showVerticalTabs ? "rotate(-180deg)" : "",
                  }}
                >
                  {tab.name}
                </div>
                <span
                  aria-hidden="true"
                  className={twMerge(
                    selectedTab.name === tab.name
                      ? twMerge(
                          "bg-primary-highlight dark:bg-blue-500",
                          typeof selectedTabHeaderClasses === "function"
                            ? selectedTabHeaderClasses?.(selectedTab.name)
                            : selectedTabHeaderClasses
                        )
                      : "bg-black/10 dark:bg-white/10",
                    "absolute",
                    showVerticalTabs
                      ? "top-0 right-0 w-0.5 h-full"
                      : "inset-x-0 bottom-0 h-0.5"
                  )}
                />
              </div>
            ))}
          </nav>
        </div>
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.name}
          className={twMerge(
            "rounded-b-2xl bg-white dark:bg-gray-800 p-4 grow min-w-0 min-h-0",
            defaultTabClassNames,
            contentClassNames,
            selectedTab?.classNames,
            selectedTab.name === tab.name
              ? "relative h-full"
              : "fixed left-[-1000px] top-[-1000px] z-[-1] pointer-events-none *:pointer-events-none opacity-0"
          )}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
