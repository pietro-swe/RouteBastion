import { admins } from "./tables/admins";
import { apiKeys } from "./tables/api-keys";
import { constraints } from "./tables/constraints";
import { customers } from "./tables/customers";
import { providerAccessMethods } from "./tables/provider-access-methods";
import { providerConstraints } from "./tables/provider-constraints";
import { providerFeatures } from "./tables/provider-features";
import { providers } from "./tables/providers";
import { vehicles } from "./tables/vehicles";

const schema = {
	admins,
	apiKeys,
	constraints,
	customers,
	providerAccessMethods,
	providerConstraints,
	providerFeatures,
	providers,
	vehicles,
};

export type Schema = typeof schema;
