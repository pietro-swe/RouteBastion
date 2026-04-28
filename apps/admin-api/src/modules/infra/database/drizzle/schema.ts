import { apiKeys } from "./tables/api-keys";
import { constraints } from "./tables/constraints";
import { customers } from "./tables/customers";
import { providers } from "./tables/providers";
import { providersAccessMethods } from "./tables/providers-access-methods";
import { providersConstraints } from "./tables/providers-constraints";
import { providersFeatures } from "./tables/providers-features";
import { users } from "./tables/users";
import { vehicles } from "./tables/vehicles";

const schema = {
	apiKeys,
	constraints,
	customers,
	providersAccessMethods,
	providersConstraints,
	providersFeatures,
	providers,
	users,
	vehicles,
};

export type Schema = typeof schema;
