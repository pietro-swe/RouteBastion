import ky from "ky";

export const http = ky.create({
	prefix: import.meta.env.VITE_API_URL,
});
