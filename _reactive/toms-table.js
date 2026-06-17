// Tom MacWright's table component, vendored from the Observable notebook
// @tmcw/tables (https://observablehq.com/@tmcw/tables): a compact, paginated,
// optionally searchable data table that right-aligns and formats numeric
// columns. Reactive posts use this in place of Inputs.table to match the look
// of the original Observable notebooks.
//
// The cell bodies below are copied verbatim from that notebook; only the module
// plumbing is new: `html`/`svg` come from htl (inlined at build time by esbuild,
// see bundle-runtime.mjs) rather than the Observable standard library, the
// inter-cell references are ordinary module bindings, and the `style()` block
// gains a small reset (clearly marked) so the host site's generic prose-table
// CSS doesn't override the component's intended minimal appearance.
import {html, svg} from "htl";

const idx = (() => {
  let i = 0;
  return () => ++i;
})();

const countDecimals = (number) =>
  number != null
    ? Math.min((number.toString().split(".")[1] || "").length, 4)
    : 0;

function detectColumns(data) {
  let columns = new Map();
  for (let row of data) {
    for (let key in row) {
      if (columns.has(key)) continue;
      if (
        typeof row[key] === "object" &&
        row[key] !== null &&
        "html" in row[key]
      ) {
        columns.set(key, {type: "html"});
      } else {
        if (row[key] instanceof Date) {
          columns.set(key, {type: "date"});
        } else {
          columns.set(key, {type: typeof row[key]});
        }
      }
    }
  }
  for (let [key, {type}] of columns) {
    if (type === "number") {
      let decimalsRequired = 0;
      for (let row of data) {
        if (countDecimals(row[key]) > decimalsRequired) {
          decimalsRequired = countDecimals(row[key]);
        }
        if (decimalsRequired == 4) break;
      }
      columns.get(key).decimalsRequired = decimalsRequired;
    }
  }
  return [...columns.entries()];
}

const basicDayFormat = (d) => {
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
};

const basicYearFormat = (d) => d.getFullYear().toString();

const tdStyles = {
  number: "text-align:right;font-variant-numeric:tabular-nums;",
  date: "font-variant-numeric:tabular-nums;",
};

const thStyles = {
  number: "text-align:right;",
};

function td(data, [key, {type, decimalsRequired}], options) {
  let rep = data[key];
  let title = "";
  if (rep === null) {
    rep = "null";
  } else if (rep === undefined) {
    rep = "–";
  } else {
    if (type === "number") {
      rep = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: decimalsRequired,
      }).format(data[key]);
    }
    if (type === "date") {
      title = data[key].toLocaleString();
      switch (options.date) {
        case "day":
          rep = basicDayFormat(data[key]);
          break;
        case "year":
          rep = basicYearFormat(data[key]);
          break;
        case "full":
          rep = data[key].toLocaleString().toLowerCase();
          break;
      }
    }
  }
  return html`<td title='${title}' style='${tdStyles[type] || ""}'>${rep}</td>`;
}

function th([key, {type}]) {
  return html`<th style='${thStyles[type] || ""}'>${key}</th>`;
}

function row(data, detectedColumns, options) {
  return html`<tr>
    ${detectedColumns.map((column) => td(data, column, options))}
  </tr>`;
}

function header(detectedColumns) {
  return html`<thead>
    ${detectedColumns.map(th)}
  </thead>`;
}

const leftIcon = () =>
  svg`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>`;

const rightIcon = () =>
  svg`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>`;

const searchIcon = () =>
  svg`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-search"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>`;

const xCircleIcon = () =>
  svg`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-x-circle"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>`;

const filterStyles = `
.search {
  padding:5px 0;
  font-family: var(--sans-serif);
  font-size: 80%;
  border-bottom:1px solid #ccc;
  max-width: 640px;
  display: flex;
  justify-content: space-between;
}
.search .search-dropdown select {
  font-family: var(--sans-serif);
}
.search .search-dropdown {
  padding-right:10px;
}
.search .query {
  padding-bottom: 5px;
}
.search .filters {
  display: flex;
  flex-wrap: wrap;
}
.search .button {
  color: #aaa;
}
.search .button:hover {
  color: #000;
  cursor: pointer;
}
`;

const style = () => html`<style>
/* --- host-site reset: the page styles bare <table>/<th>/<td> for prose tables
   (borders, gray uppercase headers, zebra striping). Neutralize that inside the
   component so it renders with its own minimal look, as on Observable. --- */
.table-2 { font: 13px/1.4 var(--sans-serif); color: var(--ink, inherit); }
.table-2 table { background: none; border: none; border-collapse: collapse; width: auto; margin: 0; font-size: inherit; }
.table-2 table th { background: none; border: none; border-bottom: 1px solid #ccc; text-transform: none; letter-spacing: normal; font-size: inherit; color: inherit; }
.table-2 table td { border: none; }
.table-2 tbody tr:nth-child(even) td { background: none; }
/* --- end reset --- */

.table-2.wide .scroll-zone {
  overflow-x: auto;
  max-width: 100%;
}
.table-2.narrow-columns td,
.table-2.narrow-columns th {
  border: 1px solid #eee;
  padding: 4px;
}
.table-2.narrow-columns th {
  background: #f9f9f9;
  border-right: 1px solid #eee;
}
.table-2.wide .pager {
  max-width: 100%;
}
.table-2 table th,
.table-2 table td {
  padding: 3px 0px;
}
.table-2 table th,
.table-2 table td {
  vertical-align: top;
}
.table-2 table td:not(:first-child),
.table-2 table th:not(:first-child) {
  padding-left: 4px;
}
.table-2 table thead th {
  ____text-transform: uppercase;
  font-weight:500;
}
.table-2 .pager .title {
  flex: auto;
  font-weight: 700;
}
.table-2 .pager {
  margin-bottom: 4px;
  box-sizing: border-box;
  border-bottom:1px solid #ccc;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  max-width: 640px;
  align-items: center;
  font-family: var(--sans-serif);
  justify-content: space-between;
}
.table-2 .pager .button.disabled {
  color: #ccc;
  pointer-events:none;
}
.table-2 .pager .button {
  display: inline-flex;
  align-items: center;
  color: #333;
}
.table-2 .pager .button:hover {
  color: #000;
  cursor: pointer;
}
.table-2 .pager select {
  font-family: var(--sans-serif);
}
.table-2 .pager .page-links {
  display: inline-flex;
  align-items: center;
}
.table-2 .pager .page-links div {
  padding: 2px 4px 2px 4px;
  cursor: pointer;
  color: #888;
}
.table-2 .pager .page-links div.current {
  padding: 2px 4px 0 4px;
  pointer-events: none;
  color: #000;
  border-bottom:2px solid #000;
}
.table-2 .pager .page-links .page-selector-container {
  padding: 4px 0;
}
${filterStyles}
</style>`;

function getDropdowns(inputData, detectedColumns) {
  let dropdowns = new Map();
  // Find columns with under 25 distinct values and
  // avoiding columns with string values over 100.
  for (let [column] of detectedColumns) {
    let uniqueValues = new Set();
    for (let row of inputData) {
      uniqueValues.add(row[column]);
      if (uniqueValues.size > 25) break;
      if (typeof row[column] === "string" && row[column].length > 100) break;
    }
    if (uniqueValues.size !== 26) {
      dropdowns.set(column, uniqueValues);
    }
  }
  let ret = new Map();
  for (let [column, choices] of dropdowns) {
    ret.set(
      column,
      [...choices].sort((a, b) => (typeof a === "string" ? b > a : b - a)),
    );
  }
  return ret;
}

function dropdown(column, choices, filters) {
  choices = [...choices];
  let id = idx();
  let elem = html`<div class='search-dropdown'>
<label for='search-${id}'>${column}</label>
<select id='search-${id}'>
<option value='-1'></option>
${choices.map((choice, i) => html`<option value=${i}>${choice}</option>`)}
</select>
</div>`;
  if (filters[column] !== undefined) {
    elem.querySelector("select").value = choices.indexOf(filters[column]);
  }
  elem.querySelector("select").onchange = (e) => {
    elem.value = choices[e.target.value];
    elem.dispatchEvent(new CustomEvent("setfilters"));
  };
  return elem;
}

function search(data, detectedColumns, filters, searchQuery) {
  let dropdowns = getDropdowns(data, detectedColumns);
  let filterContainer = html`<div class='filters'></div>`;

  let closeButton = html`<div title='Close' class='button'>${xCircleIcon()}</div>`;
  let query = html`<div class='query'>
<input type='search' autocomplete=off />
<button type=button>Search</button>
</div>`;
  let container = html`<div class='search'>
<div>
${query}
${filterContainer}
</div>
${closeButton}
</div>`;
  closeButton.onclick = () => {
    container.value = {filters: {}, searchQuery: ""};
    container.dispatchEvent(new CustomEvent("closefilters"));
  };

  let setSearchQuery = () => {
    searchQuery = query.querySelector("input").value;
    container.value = {filters, searchQuery};
    container.dispatchEvent(new CustomEvent("setfilters"));
  };
  query.querySelector("button").onclick = setSearchQuery;
  query.querySelector("input").onsearch = setSearchQuery;
  query.querySelector("input").value = searchQuery;
  [...dropdowns.entries()].map(([column, choices]) => {
    let d = dropdown(column, choices, filters);
    filterContainer.appendChild(d);
    d.addEventListener("setfilters", (e) => {
      e.stopPropagation();
      filters[column] = e.target.value;
      if (filters[column] === undefined) delete filters[column];
      container.value = {filters, searchQuery};
      container.dispatchEvent(new CustomEvent("setfilters"));
    });
  });
  return container;
}

function recommendVerticalBorders(table) {
  let narrowCells = 0;
  for (let cell of table.querySelectorAll("tbody tr:first-child td")) {
    if (cell.offsetWidth < 50) narrowCells++;
    if (narrowCells > 8) return true;
  }
}

function table(inputData, options = {}) {
  let {page, pageSize, date, title, debug} = {
    pageSize: 15,
    page: 0,
    date: "day",
    title: "",
    debug: false,
    ...options,
  };
  let first = true;
  let searching = false;
  let filters = {};
  let searchQuery = "";
  let adata = Array.from(inputData); // Normalize iterables to plain arrays.
  let detectedColumns = detectColumns(adata);
  let supercontainer = html`<div class='table-2'></div>`;

  function render() {
    let data;
    if (Object.keys(filters).length || searchQuery) {
      data = adata.filter((obj) => {
        for (let [col, value] of Object.entries(filters)) {
          if (obj[col] !== value) return false;
        }
        if (searchQuery) {
          let strValue = "";
          for (let key of Object.keys(obj)) {
            strValue += obj[key];
          }
          if (!strValue.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
          }
        }
        return true;
      });
    } else {
      data = adata;
    }
    // If we're on page 5 and then filter and yield
    // fewer than 5 pages.
    if (page * pageSize > data.length) {
      page = Math.floor(data.length / pageSize);
    }
    let start = page * pageSize;
    let end = Math.min(data.length, (page + 1) * pageSize);
    let pageCount = pageSize ? Math.ceil(data.length / pageSize) : 0;
    let chunk = data.slice(start, end);
    let hasPrev = page > 0;
    let hasNext = end < data.length;

    let prevButton = html`<div title="Previous" class='button ${
      hasPrev ? "" : "disabled"
    }'>${leftIcon()}</div>`;
    let nextButton = html`<div title="Next" class='button ${
      hasNext ? "" : "disabled"
    }'>${rightIcon()}</div>`;
    prevButton.onclick = () => {
      page--;
      render();
    };
    nextButton.onclick = () => {
      page++;
      render();
    };
    let pageLinks = html`<div class='page-links'></div>`;
    if (pageCount < 5) {
      for (let i = 0; i < pageCount; i++) {
        let elem = html`<div class='${i === page ? "current" : ""}'>${
          i + 1
        }</div>`;
        elem.onclick = () => {
          page = i;
          render();
        };
        pageLinks.appendChild(elem);
      }
    } else {
      const select = html`<div class='page-selector-container'><label for='page-selector'>Page</label> <select id='page-selector'>
    ${Array.from({length: pageCount}, (_, i) => {
      let elem = html`<option value='${i}'>${i + 1}</option>`;
      return elem;
    })}
</select></div>`;
      select.querySelector("select").value = page;
      pageLinks.appendChild(select);
      select.onchange = (e) => {
        page = parseInt(e.target.value, 10);
        render();
      };
    }
    let searchToggle = html`<div style='flex:auto;display:inline-flex;'><div title="Search / Filter" class='button'>${searchIcon()}</div></div>`;
    searchToggle.querySelector(".button").onclick = () => {
      searching = !searching;
      render();
    };
    let navigation = html`<div class='pager'>${searchToggle}
<div class='title'>${title}</div>
          ${pageLinks}
          ${prevButton}
          ${nextButton}
        </div>`;
    let tbody = html`<tbody></tbody>`;
    let tableEl = html`<table>${header(detectedColumns)}${tbody}</table>`;
    let searchUI = searching
      ? search(adata, detectedColumns, filters, searchQuery)
      : "";
    let container = html`<div>
${searchUI}
${hasNext || hasPrev ? navigation : ""}<div class='scroll-zone'>${tableEl}</div>${style()}</div>`;
    for (let d of chunk) {
      tbody.appendChild(row(d, detectedColumns, {date}));
    }

    if (searchUI) {
      searchUI.addEventListener("setfilters", (e) => {
        ({filters, searchQuery} = e.target.value);
        render();
      });
      searchUI.addEventListener("closefilters", (e) => {
        ({filters, searchQuery} = e.target.value);
        searching = false;
        render();
      });
    }

    supercontainer.innerHTML = "";
    supercontainer.appendChild(container);
    supercontainer.value = chunk;
    supercontainer.value.data = data;
    supercontainer.dispatchEvent(new CustomEvent("input"));

    if (first) {
      setTimeout(() => {
        // If the table wants to be wide, let it be wide and scrollable.
        if (supercontainer.querySelector("table").scrollWidth > 640) {
          supercontainer.classList.add("wide");
        }
        if (recommendVerticalBorders(supercontainer)) {
          supercontainer.classList.add("narrow-columns");
        }
      }, 0);
      first = false;
    }
  }
  render();
  return supercontainer;
}

export {table};
export default table;
