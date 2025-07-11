import { build } from "bun";
import dts from "bun-plugin-dts";

await build({
	entrypoints: ["./index.ts"],
	outdir: "./dist",
	plugins: [dts()],
	format: "esm",
});
