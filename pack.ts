import * as coda from "@codahq/packs-sdk";
const crypto = require("crypto");

export const pack = coda.newPack();

// Regular expression that matches Coda-hosted files.
const HostedFileUrlRegex = new RegExp("^https://(?:[^/]*.)?codahosted.io/.*");

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
    // Throw an error if the file isn't Coda-hosted. Image URL columns can
    // contain images on any domain, but by default Packs can only access image and file
    // attachments hosted on codahosted.io.
    if (!fileUrl.match(HostedFileUrlRegex)) {
      throw new coda.UserVisibleError(
        "Not compatible with text or Image URL columns - please supply an image or file that has been uploaded to Coda."
      );
    }
    // Fetch the file content.
    let response = await context.fetcher.fetch({
      method: "GET",
      url: fileUrl,
      isBinaryResponse: true, // Required when fetching binary content.
    });
    let fileBuffer = response.body as Buffer;
    const hashsum = crypto.createHash("sha1");
    hashsum.update(fileBuffer);
    return hashsum.digest("hex");
  },
});
