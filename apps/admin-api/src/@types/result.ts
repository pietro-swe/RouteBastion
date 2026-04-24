/** biome-ignore-all lint/suspicious/noExplicitAny: Types file */
export type Result<TError extends Error = Error, T = any> =
	| [TError, null]
	| [null, T];
