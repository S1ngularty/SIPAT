import * as SQlite from "expo-sqlite"

export const dbPromise = SQlite.openDatabaseAsync(
    'sipat.db'
)