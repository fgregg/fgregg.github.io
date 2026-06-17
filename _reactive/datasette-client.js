// DatasetteClient — a small client for querying a Datasette instance from the
// browser. Vendored and adapted from the Observable notebook
// @fgregg/datasette-client-with-sql-cells-full-results-csv-stream.
//
// Usage in a reactive cell:
//   const db = new DatasetteClient("https://labordata.bunkum.us/_memory");
//   const rows = await db.query`select year, count(*) as n from t
//                               where year >= ${startYear} group by year`;
// rows are CSV-parsed with d3's autoType, so numbers/dates come back typed.
//
// Tagged-template parameter binding produces Datasette named params (:p0, :p1…),
// so values are safely escaped. An array inside ${} expands to an IN-list:
//   db.query`... where id in ${[1, 2, 3]}`  ->  ... in (:p0,:p1,:p2)
import {csvParse, autoType} from "d3-dsv";

export class DatasetteClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  _fetchURL(sql, params, type = "json") {
    const search = new URLSearchParams();
    search.append("sql", sql);
    if (params) for (const key in params) search.append(key, params[key]);
    return `${this.baseUrl}.${type}?${search.toString()}`;
  }

  _parseTemplate(strings, ...values) {
    let sql = "";
    const params = {};
    let i = 0;
    for (const [n, s] of strings.entries()) {
      if (n < values.length) {
        const v = values[n];
        if (Array.isArray(v)) {
          const parts = [];
          for (const el of v) {
            const p = `p${i++}`;
            parts.push(`:${p}`);
            params[p] = el;
          }
          sql += `${s}(${parts.join(",")})`;
        } else {
          const p = `p${i++}`;
          sql += `${s}:${p}`;
          params[p] = v;
        }
      } else {
        sql += s;
      }
    }
    return {sql, params};
  }

  // query`...` (tagged template) or query(sqlString, params)
  async query(strings, ...values) {
    let sql, params;
    if (Array.isArray(strings) && "raw" in strings) {
      ({sql, params} = this._parseTemplate(strings, ...values));
    } else {
      sql = strings;
      params = values[0];
    }
    const res = await fetch(this._fetchURL(sql, params, "csv"));
    if (!res.ok) throw new Error(`Datasette query failed: ${res.status}`);
    return csvParse(await res.text(), autoType);
  }

  async geoquery(strings, ...values) {
    let sql, params;
    if (Array.isArray(strings) && "raw" in strings) {
      ({sql, params} = this._parseTemplate(strings, ...values));
    } else {
      sql = strings;
      params = values[0];
    }
    const result = await fetch(this._fetchURL(sql, params, "geojson")).then((r) => r.json());
    if (typeof result.ok !== "undefined" && !result.ok) throw new Error(result.error);
    return result;
  }
}

export default DatasetteClient;
