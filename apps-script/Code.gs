/**
 * Time Organizer backend for Google Sheets.
 *
 * Tabs (created automatically by setup()):
 *   Log       one row per work session
 *             Timestamp | Type | Project | Step | Minutes | Focus | Step done | Description | Notes | ID
 *   Projects  Project | Type | Status            (Status: active / paused / done)
 *   Steps     Type | Step | Project              (Project blank = step belongs to every project of that type)
 *
 * SETUP (once):
 *   1. Paste this whole file into Extensions > Apps Script (replace everything).
 *   2. Pick "setup" in the function dropdown, press Run, and approve the permissions.
 *   3. Deploy > New deployment > type: Web app > Execute as: Me > Who has access: Anyone > Deploy.
 *   4. Copy the Web app URL (ends in /exec) into the app's Settings.
 *
 * AFTER EDITING THIS CODE LATER:
 *   Deploy > Manage deployments > pencil icon > Version: New version > Deploy  (the URL stays the same).
 */
const LOG = "Log";
const PROJ = "Projects";
const STEPS = "Steps";
const HEAD = {
  Log: ["Timestamp", "Type", "Project", "Step", "Minutes", "Focus", "Step done", "Description", "Notes", "ID"],
  Projects: ["Project", "Type", "Status"],
  Steps: ["Type", "Step", "Project"],
};
const ID_COL = 10;

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function tab_(name) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(HEAD[name]);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEAD[name].length).setFontWeight("bold");
    if (name === LOG) {
      sh.getRange("A2:A").setNumberFormat("yyyy-mm-dd hh:mm");
      sh.getRange("J2:J").setNumberFormat("@"); // keep the 13-digit session ID as plain text
    }
  }
  return sh;
}

/** Run once from the editor. Creates the tabs and seeds the same starter types the app starts with. */
function setup() {
  tab_(LOG);
  const proj = tab_(PROJ);
  const steps = tab_(STEPS);
  if (steps.getLastRow() < 2) {
    const starter = {
      "YouTube video": ["Idea", "Script", "Film", "Edit", "Thumbnail", "Publish"],
      "Hardware product": ["Concept", "CAD", "Prototype", "Test", "Documentation"],
      "Overhead": ["Admin", "Email", "Learning"],
    };
    Object.keys(starter).forEach((t) => starter[t].forEach((s) => steps.appendRow([t, s, ""])));
  }
  if (proj.getLastRow() < 2) proj.appendRow(["Admin & overhead", "Overhead", "active"]);
}

function rows_(name) {
  const v = tab_(name).getDataRange().getDisplayValues();
  return v.slice(1).filter((r) => r.some((c) => String(c).trim() !== ""));
}

/** 1-based row number of the first row whose columns match all [col, value] pairs (case-insensitive), else 0. */
function findRow_(sh, keys) {
  const last = sh.getLastRow();
  if (last < 2) return 0;
  const nc = Math.max.apply(null, keys.map((k) => k[0]));
  const vals = sh.getRange(2, 1, last - 1, nc).getDisplayValues();
  const norm = (x) => String(x).trim().toLowerCase();
  for (let i = 0; i < vals.length; i++) {
    if (keys.every((k) => norm(vals[i][k[0] - 1]) === norm(k[1]))) return i + 2;
  }
  return 0;
}

function doGet() {
  const projects = rows_(PROJ).map((r) => ({ name: r[0], type: r[1], status: r[2] || "active" }));
  const steps = rows_(STEPS).map((r) => ({ type: r[0], step: r[1], project: r[2] }));
  // Recent session IDs let the app confirm an upload really landed before it marks it as synced.
  const log = tab_(LOG);
  const n = log.getLastRow();
  let logIds = [];
  if (n > 1) {
    const from = Math.max(2, n - 1999);
    logIds = log.getRange(from, ID_COL, n - from + 1, 1).getDisplayValues().map((r) => r[0]);
  }
  return json_({ projects: projects, steps: steps, logIds: logIds });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const d = JSON.parse(e.postData.contents);
    switch (d.op) {
      case "session": addSession_(d); break;
      case "add_type": (d.steps || []).forEach((s) => addStep_(d.name, s, "")); break;
      case "add_step": addStep_(d.type, d.step, d.project || ""); break;
      case "add_project": addProject_(d.name, d.type, d.status); break;
      case "set_status": setStatus_(d.name, d.status); break;
      default: return json_({ ok: false, error: "unknown op" });
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function addSession_(d) {
  const sh = tab_(LOG);
  // The phone resends until it sees the ID come back, so skip anything already logged.
  if (d.id && findRow_(sh, [[ID_COL, String(d.id)]])) return;
  sh.appendRow([
    new Date(d.timestamp), d.type, d.project, d.step,
    Number(d.minutes), Number(d.focus), d.done ? "Yes" : "No",
    d.description || "", d.notes || "", String(d.id || ""),
  ]);
}

function addStep_(type, step, project) {
  type = String(type || "").trim(); step = String(step || "").trim(); project = String(project || "").trim();
  if (!type || !step) return;
  const sh = tab_(STEPS);
  if (!findRow_(sh, [[1, type], [2, step], [3, project]])) sh.appendRow([type, step, project]);
}

function addProject_(name, type, status) {
  name = String(name || "").trim(); type = String(type || "").trim();
  if (!name || !type) return;
  const sh = tab_(PROJ);
  if (!findRow_(sh, [[1, name]])) sh.appendRow([name, type, status || "active"]);
}

function setStatus_(name, status) {
  if (!/^(active|paused|done)$/.test(String(status))) return;
  const sh = tab_(PROJ);
  const r = findRow_(sh, [[1, String(name || "").trim()]]);
  if (r) sh.getRange(r, 3).setValue(status);
}
