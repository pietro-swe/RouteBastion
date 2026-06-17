import swc from "unplugin-swc";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["**/*.e2e-spec.ts"],
		globals: true,
		root: "./",
		globalSetup: ["./test/e2e/global-setup.ts"],
		setupFiles: ["./test/e2e/setup-env.ts"],
		fileParallelism: false,
		testTimeout: 30000,
		hookTimeout: 120000,
	},
	plugins: [tsconfigPaths(), swc.vite()],
});
