import * as coda from "@codahq/packs-sdk";
const crypto = require("crypto");

export const pack = coda.newPack();

// Regular expression that matches Coda-hosted files.
const HostedFileUrlRegexes = [
  new RegExp("^https://(?:[^/]*.)?codahosted.io/.*"),
  new RegExp("^https://(?:[^/]*.)?codaio.imgix.net/.*"),
];

pack.addNetworkDomain("imgix.net");

pack.addFormula({
  resultType: coda.ValueType.String,
  name: "Checksum",
  description:
    "Returns the SHA1 hash of a file that has been uploaded to Coda.",
  parameters: [
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: "file",
      description:
        "The file or image that has been uploaded to your Coda doc (not compabtible with Image URL columns).",
    }),
  ],
  execute: async function ([fileUrl], context) {
    // Throw an error if we haven't received anything yet
    if (!fileUrl) {
      throw new coda.UserVisibleError(
        "Please supply an image or file that has been uploaded to Coda."
      );
    }

    // Throw an error if the input doesn't appear to be a URL
    if (!fileUrl.match(/^https?:\/\//)) {
      throw new coda.UserVisibleError(
        "It looks like you've supplied some text. This formula requires a file or image hosted on Coda."
      );
    }

    // Throw an error if the file isn't Coda-hosted. Image URL columns can
    // contain images on any domain, but by default Packs can only access image and file
    // attachments hosted on codahosted.io.
    if (
      !fileUrl.match(HostedFileUrlRegexes[0]) &&
      !fileUrl.match(HostedFileUrlRegexes[1])
    ) {
      throw new coda.UserVisibleError(
        "Not compatible with text or Image URL columns - please supply an image or file that has been uploaded to Coda."
      );
    }
    // Fetch the file content.
    let response = await context.fetcher
      .fetch({
        method: "GET",
        url: fileUrl,
        isBinaryResponse: true, // Required when fetching binary content.
      })
      .catch((e) => {
        if (e.message.match(/content size/i)) {
          throw new coda.UserVisibleError(
            "File is too large. Please select a file smaller than 4MB."
          );
        } else {
          throw new coda.UserVisibleError(
            "Error getting file contents: " + e.message
          );
        }
      });
    let fileBuffer = response.body as Buffer;
    const hashsum = crypto.createHash("sha1");
    hashsum.update(fileBuffer);
    return hashsum.digest("hex");
  },
});
