import React, { useState, useEffect } from "react";
import { Select, Input, Button, DatePicker, Space } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useChartContainer } from "./dashboardState";

const { Option } = Select;
const { RangePicker } = DatePicker;

const FilterBuilder = ({ columns }) => {
  const [filters, setFilters] = useState([]);
  const { selectedColumns, setSelectedColumns, updateChartSpecificOptions } =
    useChartContainer();

  const addFilter = () => {
    setFilters([...filters, { column: "", operator: "==", value: "" }]);
  };

  const removeFilter = (index) => {
    const newFilters = filters.filter((_, i) => i !== index);
    setFilters(newFilters);
    updateFilterFunction(newFilters);
  };

  const updateFilter = (index, field, value) => {
    const newFilters = [...filters];
    newFilters[index][field] = value;
    setFilters(newFilters);
    updateFilterFunction(newFilters);
  };

  const updateFilterFunction = (currentFilters) => {
    // Check if all filters are empty or if there are no filters
    const allFiltersEmpty = currentFilters.every(
      (filter) => !filter.column || !filter.operator || filter.value === ""
    );

    if (allFiltersEmpty || currentFilters.length === 0) {
      // If all filters are empty or there are no filters, set the chart filter to null
      updateChartSpecificOptions({ filter: null });
      return;
    }

    const filterFunction = (d) => {
      return currentFilters.every((filter) => {
        const { column, operator, value } = filter;
        // If any part of the filter is empty, consider it as always true
        if (!column || !operator || value === "") return true;

        const columnDef = columns.find((c) => c.dataIndex === column);

        switch (operator) {
          case "==":
            return d[column] == value;
          case "!=":
            return d[column] != value;
          case ">":
            return d[column] > value;
          case "<":
            return d[column] < value;
          case ">=":
            return d[column] >= value;
          case "<=":
            return d[column] <= value;
          case "in":
            return value
              .split(",")
              .map((v) => v.trim())
              .includes(d[column]);
          case "not in":
            return !value
              .split(",")
              .map((v) => v.trim())
              .includes(d[column]);
          case "contains":
            return d[column].includes(value);
          case "starts with":
            return d[column].startsWith(value);
          case "ends with":
            return d[column].endsWith(value);
          case "before":
            return new Date(d[column]) < new Date(value);
          case "after":
            return new Date(d[column]) > new Date(value);
          case "between":
            const [start, end] = value.split(",");
            if (columnDef.colType === "date") {
              return (
                new Date(d[column]) >= new Date(start) &&
                new Date(d[column]) <= new Date(end)
              );
            }
            return d[column] >= start && d[column] <= end;
          default:
            return true;
        }
      });
    };

    // Update the filter function in the chart container
    updateChartSpecificOptions({ filter: filterFunction });
  };
  const getOperators = (column) => {
    if (column.variableType === "categorical") {
      return [
        "==",
        "!=",
        "in",
        "not in",
        "contains",
        "starts with",
        "ends with",
      ];
    } else if (
      column.variableType === "quantitative" ||
      column.variableType === "integer"
    ) {
      return ["==", "!=", ">", "<", ">=", "<=", "between"];
    } else if (column.colType === "date") {
      return ["==", "!=", "before", "after", "between"];
    }
    return ["==", "!="];
  };

  const renderFilterInput = (filter, index, column) => {
    if (column.variableType === "categorical") {
      return (
        <Input
          size="small"
          value={filter.value}
          onChange={(e) => updateFilter(index, "value", e.target.value)}
          placeholder={
            ["in", "not in"].includes(filter.operator)
              ? "Comma-separated"
              : "Value"
          }
        />
      );
    }

    if (
      column.variableType === "quantitative" ||
      column.variableType === "integer"
    ) {
      if (filter.operator === "between") {
        return (
          <Input.Group compact>
            <Input
              style={{ width: "50%" }}
              size="small"
              type="number"
              value={filter.value.split(",")[0] || ""}
              onChange={(e) =>
                updateFilter(
                  index,
                  "value",
                  `${e.target.value},${filter.value.split(",")[1] || ""}`
                )
              }
              placeholder="From"
            />
            <Input
              style={{ width: "50%" }}
              size="small"
              type="number"
              value={filter.value.split(",")[1] || ""}
              onChange={(e) =>
                updateFilter(
                  index,
                  "value",
                  `${filter.value.split(",")[0] || ""},${e.target.value}`
                )
              }
              placeholder="To"
            />
          </Input.Group>
        );
      }
      return (
        <Input
          size="small"
          type="number"
          value={filter.value}
          onChange={(e) => updateFilter(index, "value", e.target.value)}
          placeholder="Value"
        />
      );
    }

    if (column.colType === "date") {
      return filter.operator === "between" ? (
        <RangePicker
          size="small"
          style={{ width: "100%" }}
          value={filter.value.split(",").map((v) => (v ? new Date(v) : null))}
          onChange={(dates, dateStrings) =>
            updateFilter(index, "value", dateStrings.join(","))
          }
        />
      ) : (
        <DatePicker
          size="small"
          style={{ width: "100%" }}
          value={filter.value ? new Date(filter.value) : null}
          onChange={(date, dateString) =>
            updateFilter(index, "value", dateString)
          }
        />
      );
    }

    return (
      <Input
        size="small"
        value={filter.value}
        onChange={(e) => updateFilter(index, "value", e.target.value)}
        placeholder="Value"
      />
    );
  };

  return (
    <Space direction="vertical" size="small" style={{ width: "100%" }}>
      {filters.map((filter, index) => {
        const column = columns.find((c) => c.dataIndex === filter.column);
        return (
          <div
            key={index}
            style={{ display: "flex", alignItems: "center", marginBottom: 8 }}
          >
            <Select
              size="small"
              style={{ width: "40%", marginRight: 4 }}
              value={filter.column}
              onChange={(value) => updateFilter(index, "column", value)}
              placeholder="Column"
            >
              {columns.map((column) => (
                <Option key={column.dataIndex} value={column.dataIndex}>
                  {column.title}
                </Option>
              ))}
            </Select>
            <Select
              size="small"
              style={{ width: "25%", marginRight: 4 }}
              value={filter.operator}
              onChange={(value) => updateFilter(index, "operator", value)}
              placeholder="Op"
            >
              {column &&
                getOperators(column).map((op) => (
                  <Option key={op} value={op}>
                    {op}
                  </Option>
                ))}
            </Select>
            <div style={{ width: "30%", marginRight: 4 }}>
              {column && renderFilterInput(filter, index, column)}
            </div>
            <Button
              size="small"
              type="text"
              icon={<DeleteOutlined />}
              onClick={() => removeFilter(index)}
              style={{ padding: 0 }}
            />
          </div>
        );
      })}
      <Button
        size="small"
        type="dashed"
        onClick={addFilter}
        block
        icon={<PlusOutlined />}
      >
        Add Filter
      </Button>
    </Space>
  );
};

export default FilterBuilder;
