export function toApiDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");

	return `${year}-${month}-${day}`;
}

export function formatDateBR(value: string): string {
	const [year, month, day] = value.slice(0, 10).split("-");

	return `${day}/${month}/${year}`;
}

export function parseApiDate(value: string): Date {
	const [year, month, day] = value
		.slice(0, 10)
		.split("-")
		.map((part) => Number(part));

	return new Date(year, month - 1, day);
}
