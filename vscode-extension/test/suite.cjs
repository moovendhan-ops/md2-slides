// Runs inside VS Code (see run.mjs). Throws on the first failed check.
const assert = require("node:assert/strict");
const path = require("node:path");
const vscode = require("vscode");

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(check, what, ms = 10000) {
  for (let t = 0; t < ms; t += 100) {
    if (await check()) return;
    await wait(100);
  }
  throw new Error(`Timed out waiting for ${what}`);
}
const tabs = () => vscode.window.tabGroups.all.flatMap((g) => g.tabs);

exports.run = async function run() {
  const file = vscode.Uri.file(path.join(__dirname, "..", "sample", "demo.md"));
  const doc = await vscode.workspace.openTextDocument(file);
  await vscode.window.showTextDocument(doc);

  const ext = vscode.extensions.all.find((e) => e.packageJSON.name === "md2slides");
  assert.ok(ext, "extension is installed");
  await until(() => ext.isActive, "activation on a Markdown file");

  const commands = await vscode.commands.getCommands(true);
  for (const c of ["slidewise.openPreview", "slidewise.present", "slidewise.openInEditor", "slidewise.insertSlide", "slidewise.insertBlock", "slidewise.insertIcon"]) assert.ok(commands.includes(c), `${c} is registered`);

  await vscode.commands.executeCommand("slidewise.openPreview");
  await until(() => tabs().some((t) => t.label === "Slides · demo.md"), "the slides panel");

  // Opening again reuses the panel.
  await vscode.commands.executeCommand("slidewise.openPreview", file);
  await wait(300);
  assert.equal(tabs().filter((t) => t.label === "Slides · demo.md").length, 1, "one panel per file");

  await vscode.commands.executeCommand("slidewise.openInEditor", file);
  await until(() => tabs().some((t) => t.input instanceof vscode.TabInputCustom && t.input.viewType === "slidewise.editor"), "the custom slides editor");
  console.log("md2slides VS Code integration tests passed");
};
