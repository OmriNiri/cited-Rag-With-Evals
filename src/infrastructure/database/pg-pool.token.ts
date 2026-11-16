// Injection token for the shared pg Pool. A Symbol (not the Pool class) is used so
// consumers ask for "the app's pool" explicitly: @Inject(PG_POOL).
// Own file so DatabaseModule and the classes it provides can both import it
// without importing each other (no circular import).
export const PG_POOL = Symbol('PG_POOL');
