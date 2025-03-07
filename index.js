const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const glob = require('glob');

const toolkit = require('@github/dependency-submission-toolkit');
const lib = require('./lib');

const VERSION = "0.2.0-extra-inputs";

async function run() {
  let manifests = lib.getManifestsFromSpdxFiles(lib.searchFiles());

  const correlator = core.getInput('correlator');

  // shallow clone of the github context, then override defaults with inputs
  // only including what we need of the context, for using with the submission toolkit, vs a full deep clone
  let context = Object.assign({}, github.context);
  context.repo = Object.assign({}, github.context.repo);

  const ref = core.getInput('ref');
  const sha = core.getInput('sha');

  if (ref != '') {
    context.ref = ref;
  }
  if (sha != '') {
    context.sha = sha;
  }

  let snapshot = new toolkit.Snapshot({
    name: "spdx-to-dependency-graph-action",
    version: VERSION,
    url: "https://github.com/aegilops/spdx-dependency-submission-action",
  },
    context,
    {
      correlator: correlator,
      id: github.context.runId.toString()
    });

  // override generated Snapshot with inputs, if they are present
  if (ref != '') {
    snapshot.ref = ref;
  }
  if (sha != '') {
    snapshot.sha = sha;
  }

  if (ref == '' || sha == '') {
    core.notice(`Submitting snapshot for ref ${snapshot.ref} and SHA ${snapshot.sha}`);
  }

  manifests?.forEach(manifest => {
    snapshot.addManifest(manifest);
  });
  
  toolkit.submitSnapshot(snapshot, context);
}

run();
