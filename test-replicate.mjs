import Replicate from "replicate";
const replicate = new Replicate();
async function main() {
  const output = await replicate.run("black-forest-labs/flux-schnell", {
    input: { prompt: "a cat" }
  });
  console.log("Type:", typeof output);
  console.log("IsArray:", Array.isArray(output));
  if (Array.isArray(output)) {
    console.log("Element Type:", typeof output[0]);
    console.log("Keys:", Object.keys(output[0]));
    console.log("Element:", output[0]);
    console.log("Constructor name:", output[0].constructor.name);
    if (output[0].url) {
      console.log("URL:", output[0].url());
    }
  }
}
main().catch(console.error);
