const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const glob = require('glob');

const toolkit = require('@github/dependency-submission-toolkit');
const lib = require('./lib');

const VERSION = "0.1.1";

async function run() {
  let manifests = lib.getManifestsFromSpdxFiles(lib.searchFiles());

  const correlator = core.getInput('correlator');

  // shallow clone of the github context, then override defaults with inputs
  let context = Object.assign({}, github.context);

  const ref = core.getInput('ref');
  const sha = core.getInput('sha');
  const repository = core.getInput('repository');

  context.ref = ref;
  context.sha = sha;
  context.repo = repository;

  let snapshot = new toolkit.Snapshot({
    name: "spdx-to-dependency-graph-action",
    version: VERSION,
    url: "https://github.com/advanced-security/spdx-dependency-submission-action",
  },
    context,
    {
      correlator: correlator,
      id: github.context.runId.toString()
    });

  manifests?.forEach(manifest => {
    snapshot.addManifest(manifest);
  });
  
  toolkit.submitSnapshot(snapshot, context);
}

run();
