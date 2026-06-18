const NON_DIGITS = /\D/g;
const CNPJ_PATTERN = /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/;

export function formatCnpj(value: string): string {
	const digits = value.replace(NON_DIGITS, "");

	if (digits.length !== 14) {
		return value;
	}

	return digits.replace(CNPJ_PATTERN, "$1.$2.$3/$4-$5");
}
