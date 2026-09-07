# Actual Budget MCP v1 Tool Inventory

This file is generated from the authoritative runtime definitions in `src/mcp/tool-definitions.ts` and the
test-only evidence manifest in `test/fixtures/tool-verification-manifest-v1.json`. Do not edit it by hand.

- Tool count: 62
- Compatibility baseline: Actual Budget MCP 0.7.0 at `c5b752a5f7f3067a40480f72078907c72ad26c66`
- Capability totals: 27 read, 26 write, 9 destructive (35 mutation-capable)
- Schema dialect: JSON Schema draft 2020-12

## `actual_bulk_update_transactions`

- Title: Bulk update Actual transactions safely
- Domain: `transactions`
- Description: Plan up to 100 heterogeneous desired-state updates in dry-run mode by default; execution requires dryRun false and confirmWrite true.
- Capability: `write`
- Mutation-capable: Yes
- Destructive: No
- Idempotent: Yes
- Confirmation: `confirm-write`
- Bounds: `MAX_ID_LENGTH`, `MAX_ENTITY_NAME_LENGTH`, `MAX_TEXT_LENGTH`, `MAX_DATE_RANGE_DAYS`, `MAX_BULK_TRANSACTION_UPDATES`
- Runtime guards: `ACTUAL_MCP_READ_ONLY`
- Synchronization: `write-and-sync`
- Partial failure: `multi-step`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/write.integration.test.ts` — preflights and executes three heterogeneous bulk updates with exact cleanup and idempotent repeat
- Compiled stdio E2E evidence: `test/e2e/write.e2e.test.ts` — runs bulk dry-run, confirmation, heterogeneous execution, exact read-back, and idempotent repeat through compiled stdio

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "One to 100 unique heterogeneous desired-state transaction updates; dry-run defaults to true.",
  "properties": {
    "confirmWrite": {
      "type": "boolean"
    },
    "dryRun": {
      "default": true,
      "type": "boolean"
    },
    "items": {
      "items": {
        "additionalProperties": false,
        "properties": {
          "fields": {
            "additionalProperties": false,
            "properties": {
              "category": {
                "anyOf": [
                  {
                    "maxLength": 512,
                    "minLength": 1,
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ]
              },
              "cleared": {
                "type": "boolean"
              },
              "notes": {
                "anyOf": [
                  {
                    "maxLength": 10000,
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ]
              },
              "payee": {
                "anyOf": [
                  {
                    "maxLength": 512,
                    "minLength": 1,
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ]
              }
            },
            "type": "object"
          },
          "transactionId": {
            "maxLength": 512,
            "minLength": 1,
            "type": "string"
          }
        },
        "required": [
          "transactionId",
          "fields"
        ],
        "type": "object"
      },
      "maxItems": 100,
      "minItems": 1,
      "type": "array"
    }
  },
  "required": [
    "items"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$defs": {
    "__schema0": {
      "additionalProperties": false,
      "description": "Normalized Actual transaction. Explicit null values from Actual are preserved; absent optional fields remain absent.",
      "properties": {
        "account": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "amount": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "category": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "category_name": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "cleared": {
          "type": "boolean"
        },
        "date": {
          "type": "string"
        },
        "id": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "imported_id": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "imported_payee": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "is_child": {
          "type": "boolean"
        },
        "is_parent": {
          "type": "boolean"
        },
        "isTransfer": {
          "type": "boolean"
        },
        "notes": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "parent_id": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "payee": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "payee_name": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "reconciled": {
          "type": "boolean"
        },
        "starting_balance_flag": {
          "type": "boolean"
        },
        "subtransactions": {
          "items": {
            "$ref": "#/$defs/__schema0"
          },
          "type": "array"
        },
        "transfer_id": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "id",
        "account",
        "date",
        "amount"
      ],
      "type": "object"
    }
  },
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Auditable bulk plan or verified single-sync execution result.",
  "properties": {
    "affectedIds": {
      "items": {
        "maxLength": 512,
        "minLength": 1,
        "type": "string"
      },
      "type": "array"
    },
    "counts": {
      "additionalProperties": false,
      "properties": {
        "blocked": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        },
        "matched": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        },
        "requested": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        },
        "unchanged": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        },
        "wouldUpdate": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        }
      },
      "required": [
        "requested",
        "matched",
        "wouldUpdate",
        "unchanged",
        "blocked"
      ],
      "type": "object"
    },
    "dryRun": {
      "type": "boolean"
    },
    "executable": {
      "type": "boolean"
    },
    "executed": {
      "type": "boolean"
    },
    "items": {
      "items": {
        "additionalProperties": false,
        "properties": {
          "after": {
            "$ref": "#/$defs/__schema0"
          },
          "before": {
            "$ref": "#/$defs/__schema0"
          },
          "changedFields": {
            "items": {
              "enum": [
                "category",
                "payee",
                "notes",
                "cleared"
              ],
              "type": "string"
            },
            "type": "array"
          },
          "reason": {
            "enum": [
              "SPLIT_TRANSACTION_PROTECTED",
              "TRANSFER_PROTECTED"
            ],
            "type": "string"
          },
          "status": {
            "enum": [
              "would_update",
              "unchanged",
              "blocked"
            ],
            "type": "string"
          },
          "transactionId": {
            "maxLength": 512,
            "minLength": 1,
            "type": "string"
          }
        },
        "required": [
          "transactionId",
          "status",
          "changedFields",
          "before",
          "after"
        ],
        "type": "object"
      },
      "maxItems": 100,
      "type": "array"
    },
    "synchronized": {
      "type": "boolean"
    },
    "unchangedIds": {
      "items": {
        "maxLength": 512,
        "minLength": 1,
        "type": "string"
      },
      "type": "array"
    },
    "updatedIds": {
      "items": {
        "maxLength": 512,
        "minLength": 1,
        "type": "string"
      },
      "type": "array"
    },
    "verified": {
      "type": "boolean"
    }
  },
  "required": [
    "dryRun",
    "executed",
    "synchronized",
    "verified",
    "executable",
    "counts",
    "items",
    "updatedIds",
    "unchangedIds",
    "affectedIds"
  ],
  "type": "object"
}
```

</details>

## `actual_close_account`

- Title: Safely close Actual account
- Domain: `accounts`
- Description: Safely close a non-empty Actual account after complete history and balance-transfer preflight.
- Capability: `write`
- Mutation-capable: Yes
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`
- Runtime guards: `ACTUAL_MCP_READ_ONLY`
- Synchronization: `write-and-sync`
- Partial failure: `sync-after-write`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/write.integration.test.ts` — administers isolated account and category structure with exact-ID cleanup and complete safety preflights
- Compiled stdio E2E evidence: `test/e2e/write.e2e.test.ts` — exercises the complete structural lifecycle through real MCP stdio

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Account to close and optional official balance-transfer targets.",
  "properties": {
    "accountId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    },
    "transferAccountId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    },
    "transferCategoryId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    }
  },
  "required": [
    "accountId"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Persisted account state after a structural operation.",
  "properties": {
    "account": {
      "additionalProperties": false,
      "description": "Normalized Actual account.",
      "properties": {
        "balance": {
          "description": "Ledger balance in integer minor units.",
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "balanceError": {
          "description": "Sanitized balance lookup error, when balance retrieval failed.",
          "type": "string"
        },
        "closed": {
          "description": "Whether the account is closed.",
          "type": "boolean"
        },
        "id": {
          "description": "Opaque Actual account identifier.",
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "name": {
          "description": "User-authored account name, returned verbatim.",
          "type": "string"
        },
        "offbudget": {
          "description": "Whether the account is excluded from the budget.",
          "type": "boolean"
        }
      },
      "required": [
        "id",
        "name",
        "offbudget",
        "closed"
      ],
      "type": "object"
    },
    "changed": {
      "description": "Whether this call changed persisted Actual state.",
      "type": "boolean"
    },
    "success": {
      "const": true,
      "type": "boolean"
    }
  },
  "required": [
    "success",
    "changed",
    "account"
  ],
  "type": "object"
}
```

</details>

## `actual_copy_budget_month`

- Title: Preview or copy monthly planning
- Domain: `budget`
- Description: Preview by default or sequentially copy bounded category planning with hidden opt-in and confirmed nonzero overwrite protection.
- Capability: `destructive`
- Mutation-capable: Yes
- Destructive: Yes
- Idempotent: Yes
- Confirmation: `budget-copy`
- Bounds: `MAX_BUDGET_COPY_DIFFERENCE_RESULTS`, `MAX_BUDGET_COPY_CHANGES`
- Runtime guards: `ACTUAL_MCP_READ_ONLY`, then `ACTUAL_MCP_ALLOW_DESTRUCTIVE`
- Synchronization: `write-and-sync`
- Partial failure: `multi-step`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/write.integration.test.ts` — uses dynamically selected clean months for verified budget amount, carryover, hold/reset, and copy writes
- Compiled stdio E2E evidence: `test/e2e/write.e2e.test.ts` — executes guarded budget writes and copy through compiled MCP stdio with exact cleanup

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Bounded budget copy request; defaults to a fill-empty dry run without carryover or hidden categories.",
  "properties": {
    "confirmOverwrite": {
      "default": false,
      "type": "boolean"
    },
    "differenceLimit": {
      "default": 100,
      "maximum": 500,
      "minimum": 1,
      "type": "integer"
    },
    "dryRun": {
      "default": true,
      "type": "boolean"
    },
    "includeCarryover": {
      "default": false,
      "type": "boolean"
    },
    "includeHidden": {
      "default": false,
      "type": "boolean"
    },
    "maxChanges": {
      "default": 500,
      "maximum": 500,
      "minimum": 1,
      "type": "integer"
    },
    "mode": {
      "default": "fill-empty",
      "enum": [
        "fill-empty",
        "overwrite"
      ],
      "type": "string"
    },
    "sourceMonth": {
      "type": "string"
    },
    "targetMonth": {
      "type": "string"
    }
  },
  "required": [
    "sourceMonth",
    "targetMonth"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Bounded copy preview or verified sequential execution metadata.",
  "properties": {
    "attemptedCategoryIds": {
      "items": {
        "maxLength": 512,
        "minLength": 1,
        "type": "string"
      },
      "type": "array"
    },
    "changed": {
      "description": "Whether this call changed persisted Actual state.",
      "type": "boolean"
    },
    "completedCategoryIds": {
      "items": {
        "maxLength": 512,
        "minLength": 1,
        "type": "string"
      },
      "type": "array"
    },
    "counts": {
      "additionalProperties": false,
      "properties": {
        "changes": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        },
        "hiddenSkip": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        },
        "incompatibleSkip": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        },
        "overwrite": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        },
        "set": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        },
        "skip": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        },
        "total": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        },
        "unchanged": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        }
      },
      "required": [
        "total",
        "changes",
        "set",
        "overwrite",
        "skip",
        "hiddenSkip",
        "incompatibleSkip",
        "unchanged"
      ],
      "type": "object"
    },
    "differences": {
      "items": {
        "additionalProperties": false,
        "properties": {
          "action": {
            "enum": [
              "set",
              "overwrite",
              "skip",
              "skip-hidden",
              "skip-incompatible",
              "unchanged"
            ],
            "type": "string"
          },
          "amountChange": {
            "type": "boolean"
          },
          "carryoverChange": {
            "type": "boolean"
          },
          "categoryId": {
            "maxLength": 512,
            "minLength": 1,
            "type": "string"
          },
          "categoryName": {
            "type": "string"
          },
          "groupId": {
            "maxLength": 512,
            "minLength": 1,
            "type": "string"
          },
          "hidden": {
            "type": "boolean"
          },
          "sourceBudgeted": {
            "maximum": 9007199254740991,
            "minimum": -9007199254740991,
            "type": "integer"
          },
          "sourceCarryover": {
            "type": "boolean"
          },
          "targetBudgeted": {
            "maximum": 9007199254740991,
            "minimum": -9007199254740991,
            "type": "integer"
          },
          "targetCarryover": {
            "type": "boolean"
          }
        },
        "required": [
          "categoryId",
          "categoryName",
          "groupId",
          "hidden",
          "action",
          "amountChange",
          "carryoverChange"
        ],
        "type": "object"
      },
      "type": "array"
    },
    "dryRun": {
      "type": "boolean"
    },
    "executed": {
      "type": "boolean"
    },
    "includeCarryover": {
      "type": "boolean"
    },
    "includeHidden": {
      "type": "boolean"
    },
    "mode": {
      "enum": [
        "fill-empty",
        "overwrite"
      ],
      "type": "string"
    },
    "omittedDifferenceCount": {
      "maximum": 9007199254740991,
      "minimum": 0,
      "type": "integer"
    },
    "prospectiveCarryover": {
      "type": "boolean"
    },
    "sourceMonth": {
      "type": "string"
    },
    "success": {
      "const": true,
      "type": "boolean"
    },
    "synchronized": {
      "type": "boolean"
    },
    "targetMonth": {
      "type": "string"
    },
    "verified": {
      "type": "boolean"
    }
  },
  "required": [
    "success",
    "changed",
    "dryRun",
    "executed",
    "synchronized",
    "verified",
    "sourceMonth",
    "targetMonth",
    "mode",
    "includeCarryover",
    "includeHidden",
    "prospectiveCarryover",
    "counts",
    "differences",
    "omittedDifferenceCount",
    "attemptedCategoryIds",
    "completedCategoryIds"
  ],
  "type": "object"
}
```

</details>

## `actual_create_account`

- Title: Create Actual account
- Domain: `accounts`
- Description: Create an Actual account with an optional signed integer opening balance, then synchronize and verify it.
- Capability: `write`
- Mutation-capable: Yes
- Destructive: No
- Idempotent: No
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`, `MAX_ENTITY_NAME_LENGTH`
- Runtime guards: `ACTUAL_MCP_READ_ONLY`
- Synchronization: `write-and-sync`
- Partial failure: `sync-after-write`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/write.integration.test.ts` — administers isolated account and category structure with exact-ID cleanup and complete safety preflights
- Compiled stdio E2E evidence: `test/e2e/write.e2e.test.ts` — exercises the complete structural lifecycle through real MCP stdio

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "New account name, budget inclusion, and optional signed opening balance in integer minor units.",
  "properties": {
    "initialBalance": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    },
    "name": {
      "maxLength": 255,
      "minLength": 1,
      "type": "string"
    },
    "offbudget": {
      "default": false,
      "type": "boolean"
    }
  },
  "required": [
    "name"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Persisted account state after a structural operation.",
  "properties": {
    "account": {
      "additionalProperties": false,
      "description": "Normalized Actual account.",
      "properties": {
        "balance": {
          "description": "Ledger balance in integer minor units.",
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "balanceError": {
          "description": "Sanitized balance lookup error, when balance retrieval failed.",
          "type": "string"
        },
        "closed": {
          "description": "Whether the account is closed.",
          "type": "boolean"
        },
        "id": {
          "description": "Opaque Actual account identifier.",
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "name": {
          "description": "User-authored account name, returned verbatim.",
          "type": "string"
        },
        "offbudget": {
          "description": "Whether the account is excluded from the budget.",
          "type": "boolean"
        }
      },
      "required": [
        "id",
        "name",
        "offbudget",
        "closed"
      ],
      "type": "object"
    },
    "changed": {
      "description": "Whether this call changed persisted Actual state.",
      "type": "boolean"
    },
    "success": {
      "const": true,
      "type": "boolean"
    }
  },
  "required": [
    "success",
    "changed",
    "account"
  ],
  "type": "object"
}
```

</details>

## `actual_create_category`

- Title: Create Actual category
- Domain: `categories`
- Description: Create a visible category whose income or expense type is derived from its persisted group.
- Capability: `write`
- Mutation-capable: Yes
- Destructive: No
- Idempotent: No
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`, `MAX_ENTITY_NAME_LENGTH`
- Runtime guards: `ACTUAL_MCP_READ_ONLY`
- Synchronization: `write-and-sync`
- Partial failure: `sync-after-write`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/write.integration.test.ts` — administers isolated account and category structure with exact-ID cleanup and complete safety preflights
- Compiled stdio E2E evidence: `test/e2e/write.e2e.test.ts` — exercises the complete structural lifecycle through real MCP stdio

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "New visible category whose type is derived from its persisted group.",
  "properties": {
    "groupId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    },
    "name": {
      "maxLength": 255,
      "minLength": 1,
      "type": "string"
    }
  },
  "required": [
    "name",
    "groupId"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Persisted category state after a structural operation.",
  "properties": {
    "category": {
      "additionalProperties": false,
      "description": "Normalized category administration entity.",
      "properties": {
        "groupId": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "hidden": {
          "type": "boolean"
        },
        "id": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "isIncome": {
          "type": "boolean"
        },
        "name": {
          "type": "string"
        }
      },
      "required": [
        "id",
        "name",
        "groupId",
        "isIncome",
        "hidden"
      ],
      "type": "object"
    },
    "changed": {
      "description": "Whether this call changed persisted Actual state.",
      "type": "boolean"
    },
    "success": {
      "const": true,
      "type": "boolean"
    }
  },
  "required": [
    "success",
    "changed",
    "category"
  ],
  "type": "object"
}
```

</details>

## `actual_create_category_group`

- Title: Create Actual category group
- Domain: `categories`
- Description: Create a visible expense or income category group, synchronize, and verify it.
- Capability: `write`
- Mutation-capable: Yes
- Destructive: No
- Idempotent: No
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`, `MAX_ENTITY_NAME_LENGTH`
- Runtime guards: `ACTUAL_MCP_READ_ONLY`
- Synchronization: `write-and-sync`
- Partial failure: `sync-after-write`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/write.integration.test.ts` — administers isolated account and category structure with exact-ID cleanup and complete safety preflights
- Compiled stdio E2E evidence: `test/e2e/write.e2e.test.ts` — exercises the complete structural lifecycle through real MCP stdio

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "New visible category group with an explicit or default expense/income type.",
  "properties": {
    "isIncome": {
      "default": false,
      "type": "boolean"
    },
    "name": {
      "maxLength": 255,
      "minLength": 1,
      "type": "string"
    }
  },
  "required": [
    "name"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Persisted category-group state after a structural operation.",
  "properties": {
    "categoryGroup": {
      "additionalProperties": false,
      "description": "Normalized category-group administration entity.",
      "properties": {
        "hidden": {
          "type": "boolean"
        },
        "id": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "isIncome": {
          "type": "boolean"
        },
        "name": {
          "type": "string"
        }
      },
      "required": [
        "id",
        "name",
        "isIncome",
        "hidden"
      ],
      "type": "object"
    },
    "changed": {
      "description": "Whether this call changed persisted Actual state.",
      "type": "boolean"
    },
    "success": {
      "const": true,
      "type": "boolean"
    }
  },
  "required": [
    "success",
    "changed",
    "categoryGroup"
  ],
  "type": "object"
}
```

</details>

## `actual_create_payee`

- Title: Create Actual payee
- Domain: `payees`
- Description: Create an ordinary payee or return the single exact existing ordinary payee, then verify persisted state.
- Capability: `write`
- Mutation-capable: Yes
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`, `MAX_ENTITY_NAME_LENGTH`
- Runtime guards: `ACTUAL_MCP_READ_ONLY`
- Synchronization: `write-and-sync`
- Partial failure: `sync-after-write`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/write.integration.test.ts` — runs the guarded real payee create, read, rename, preflight, and delete lifecycle
- Compiled stdio E2E evidence: `test/e2e/write.e2e.test.ts` — runs a restart-safe payee lifecycle through MCP-only calls

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Name for an ordinary Actual payee; no transfer or category metadata is accepted.",
  "properties": {
    "name": {
      "maxLength": 255,
      "minLength": 1,
      "type": "string"
    }
  },
  "required": [
    "name"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Persisted payee state after a create or rename operation.",
  "properties": {
    "changed": {
      "description": "Whether this call changed persisted Actual state.",
      "type": "boolean"
    },
    "payee": {
      "additionalProperties": false,
      "description": "One Actual payee with transfer context preserved when supplied by the official API.",
      "properties": {
        "id": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "name": {
          "type": "string"
        },
        "transferAccountId": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "id",
        "name"
      ],
      "type": "object"
    },
    "success": {
      "const": true,
      "type": "boolean"
    }
  },
  "required": [
    "success",
    "changed",
    "payee"
  ],
  "type": "object"
}
```

</details>

## `actual_create_rule`

- Title: Create Actual rule
- Domain: `rules`
- Description: Create one supported non-destructive Actual rule after validating every referenced entity.
- Capability: `write`
- Mutation-capable: Yes
- Destructive: No
- Idempotent: No
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`, `MAX_ENTITY_NAME_LENGTH`, `MAX_TEXT_LENGTH`, `MAX_RULE_CONDITIONS`, `MAX_RULE_ACTIONS`, `MAX_RULE_LIST_VALUES`
- Runtime guards: `ACTUAL_MCP_READ_ONLY`
- Synchronization: `write-and-sync`
- Partial failure: `sync-after-write`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/write.integration.test.ts` — persists, updates, functionally executes, and deletes a uniquely owned rule
- Compiled stdio E2E evidence: `test/e2e/write.e2e.test.ts` — creates, updates, functionally executes, and deletes a rule using only MCP tool calls

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Complete supported rule authoring request.",
  "properties": {
    "actions": {
      "items": {
        "anyOf": [
          {
            "anyOf": [
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "category",
                    "type": "string"
                  },
                  "op": {
                    "const": "set",
                    "type": "string"
                  },
                  "value": {
                    "maxLength": 512,
                    "minLength": 1,
                    "type": "string"
                  }
                },
                "required": [
                  "op",
                  "field",
                  "value"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "payee",
                    "type": "string"
                  },
                  "op": {
                    "const": "set",
                    "type": "string"
                  },
                  "value": {
                    "maxLength": 512,
                    "minLength": 1,
                    "type": "string"
                  }
                },
                "required": [
                  "op",
                  "field",
                  "value"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "account",
                    "type": "string"
                  },
                  "op": {
                    "const": "set",
                    "type": "string"
                  },
                  "value": {
                    "maxLength": 512,
                    "minLength": 1,
                    "type": "string"
                  }
                },
                "required": [
                  "op",
                  "field",
                  "value"
                ],
                "type": "object"
              }
            ]
          },
          {
            "additionalProperties": false,
            "properties": {
              "field": {
                "const": "notes",
                "type": "string"
              },
              "op": {
                "const": "set",
                "type": "string"
              },
              "value": {
                "maxLength": 10000,
                "type": "string"
              }
            },
            "required": [
              "op",
              "field",
              "value"
            ],
            "type": "object"
          },
          {
            "additionalProperties": false,
            "properties": {
              "field": {
                "const": "cleared",
                "type": "string"
              },
              "op": {
                "const": "set",
                "type": "string"
              },
              "value": {
                "type": "boolean"
              }
            },
            "required": [
              "op",
              "field",
              "value"
            ],
            "type": "object"
          },
          {
            "additionalProperties": false,
            "properties": {
              "field": {
                "const": "date",
                "type": "string"
              },
              "op": {
                "const": "set",
                "type": "string"
              },
              "value": {
                "type": "string"
              }
            },
            "required": [
              "op",
              "field",
              "value"
            ],
            "type": "object"
          },
          {
            "additionalProperties": false,
            "properties": {
              "field": {
                "const": "amount",
                "type": "string"
              },
              "op": {
                "const": "set",
                "type": "string"
              },
              "value": {
                "maximum": 9007199254740991,
                "minimum": -9007199254740991,
                "type": "integer"
              }
            },
            "required": [
              "op",
              "field",
              "value"
            ],
            "type": "object"
          },
          {
            "additionalProperties": false,
            "properties": {
              "op": {
                "const": "prepend-notes",
                "type": "string"
              },
              "value": {
                "maxLength": 10000,
                "type": "string"
              }
            },
            "required": [
              "op",
              "value"
            ],
            "type": "object"
          },
          {
            "additionalProperties": false,
            "properties": {
              "op": {
                "const": "append-notes",
                "type": "string"
              },
              "value": {
                "maxLength": 10000,
                "type": "string"
              }
            },
            "required": [
              "op",
              "value"
            ],
            "type": "object"
          }
        ],
        "description": "One supported non-destructive rule action."
      },
      "maxItems": 100,
      "minItems": 1,
      "type": "array"
    },
    "conditions": {
      "items": {
        "anyOf": [
          {
            "anyOf": [
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "account",
                    "type": "string"
                  },
                  "op": {
                    "enum": [
                      "is",
                      "isNot",
                      "contains",
                      "doesNotContain",
                      "matches"
                    ],
                    "type": "string"
                  },
                  "value": {
                    "maxLength": 512,
                    "minLength": 1,
                    "type": "string"
                  }
                },
                "required": [
                  "field",
                  "op",
                  "value"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "account",
                    "type": "string"
                  },
                  "op": {
                    "enum": [
                      "oneOf",
                      "notOneOf"
                    ],
                    "type": "string"
                  },
                  "value": {
                    "items": {
                      "maxLength": 512,
                      "minLength": 1,
                      "type": "string"
                    },
                    "maxItems": 250,
                    "minItems": 1,
                    "type": "array"
                  }
                },
                "required": [
                  "field",
                  "op",
                  "value"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "account",
                    "type": "string"
                  },
                  "op": {
                    "enum": [
                      "onBudget",
                      "offBudget"
                    ],
                    "type": "string"
                  },
                  "value": {
                    "maxLength": 512,
                    "minLength": 1,
                    "type": "string"
                  }
                },
                "required": [
                  "field",
                  "op",
                  "value"
                ],
                "type": "object"
              }
            ]
          },
          {
            "anyOf": [
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "category",
                    "type": "string"
                  },
                  "op": {
                    "enum": [
                      "is",
                      "isNot",
                      "contains",
                      "doesNotContain",
                      "matches"
                    ],
                    "type": "string"
                  },
                  "value": {
                    "maxLength": 512,
                    "minLength": 1,
                    "type": "string"
                  }
                },
                "required": [
                  "field",
                  "op",
                  "value"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "category",
                    "type": "string"
                  },
                  "op": {
                    "enum": [
                      "oneOf",
                      "notOneOf"
                    ],
                    "type": "string"
                  },
                  "value": {
                    "items": {
                      "maxLength": 512,
                      "minLength": 1,
                      "type": "string"
                    },
                    "maxItems": 250,
                    "minItems": 1,
                    "type": "array"
                  }
                },
                "required": [
                  "field",
                  "op",
                  "value"
                ],
                "type": "object"
              }
            ]
          },
          {
            "anyOf": [
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "category_group",
                    "type": "string"
                  },
                  "op": {
                    "enum": [
                      "is",
                      "isNot",
                      "contains",
                      "doesNotContain",
                      "matches"
                    ],
                    "type": "string"
                  },
                  "value": {
                    "maxLength": 512,
                    "minLength": 1,
                    "type": "string"
                  }
                },
                "required": [
                  "field",
                  "op",
                  "value"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "category_group",
                    "type": "string"
                  },
                  "op": {
                    "enum": [
                      "oneOf",
                      "notOneOf"
                    ],
                    "type": "string"
                  },
                  "value": {
                    "items": {
                      "maxLength": 512,
                      "minLength": 1,
                      "type": "string"
                    },
                    "maxItems": 250,
                    "minItems": 1,
                    "type": "array"
                  }
                },
                "required": [
                  "field",
                  "op",
                  "value"
                ],
                "type": "object"
              }
            ]
          },
          {
            "anyOf": [
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "payee",
                    "type": "string"
                  },
                  "op": {
                    "enum": [
                      "is",
                      "isNot",
                      "contains",
                      "doesNotContain",
                      "matches"
                    ],
                    "type": "string"
                  },
                  "value": {
                    "maxLength": 512,
                    "minLength": 1,
                    "type": "string"
                  }
                },
                "required": [
                  "field",
                  "op",
                  "value"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "payee",
                    "type": "string"
                  },
                  "op": {
                    "enum": [
                      "oneOf",
                      "notOneOf"
                    ],
                    "type": "string"
                  },
                  "value": {
                    "items": {
                      "maxLength": 512,
                      "minLength": 1,
                      "type": "string"
                    },
                    "maxItems": 250,
                    "minItems": 1,
                    "type": "array"
                  }
                },
                "required": [
                  "field",
                  "op",
                  "value"
                ],
                "type": "object"
              }
            ]
          },
          {
            "anyOf": [
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "imported_payee",
                    "type": "string"
                  },
                  "op": {
                    "enum": [
                      "is",
                      "isNot",
                      "contains",
                      "doesNotContain",
                      "matches"
                    ],
                    "type": "string"
                  },
                  "value": {
                    "maxLength": 10000,
                    "minLength": 1,
                    "type": "string"
                  }
                },
                "required": [
                  "field",
                  "op",
                  "value"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "imported_payee",
                    "type": "string"
                  },
                  "op": {
                    "enum": [
                      "oneOf",
                      "notOneOf"
                    ],
                    "type": "string"
                  },
                  "value": {
                    "items": {
                      "maxLength": 10000,
                      "minLength": 1,
                      "type": "string"
                    },
                    "maxItems": 250,
                    "minItems": 1,
                    "type": "array"
                  }
                },
                "required": [
                  "field",
                  "op",
                  "value"
                ],
                "type": "object"
              }
            ]
          },
          {
            "additionalProperties": false,
            "properties": {
              "field": {
                "const": "notes",
                "type": "string"
              },
              "op": {
                "enum": [
                  "is",
                  "isNot",
                  "contains",
                  "doesNotContain",
                  "matches",
                  "hasTags",
                  "hasAnyTag"
                ],
                "type": "string"
              },
              "value": {
                "maxLength": 10000,
                "minLength": 1,
                "type": "string"
              }
            },
            "required": [
              "field",
              "op",
              "value"
            ],
            "type": "object"
          },
          {
            "anyOf": [
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "amount",
                    "type": "string"
                  },
                  "op": {
                    "enum": [
                      "is",
                      "isapprox",
                      "gt",
                      "gte",
                      "lt",
                      "lte"
                    ],
                    "type": "string"
                  },
                  "options": {
                    "additionalProperties": false,
                    "properties": {
                      "inflow": {
                        "type": "boolean"
                      },
                      "outflow": {
                        "type": "boolean"
                      }
                    },
                    "type": "object"
                  },
                  "value": {
                    "maximum": 9007199254740991,
                    "minimum": -9007199254740991,
                    "type": "integer"
                  }
                },
                "required": [
                  "field",
                  "op",
                  "value"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "amount",
                    "type": "string"
                  },
                  "op": {
                    "const": "isbetween",
                    "type": "string"
                  },
                  "options": {
                    "additionalProperties": false,
                    "properties": {
                      "inflow": {
                        "type": "boolean"
                      },
                      "outflow": {
                        "type": "boolean"
                      }
                    },
                    "type": "object"
                  },
                  "value": {
                    "additionalProperties": false,
                    "properties": {
                      "num1": {
                        "maximum": 9007199254740991,
                        "minimum": -9007199254740991,
                        "type": "integer"
                      },
                      "num2": {
                        "maximum": 9007199254740991,
                        "minimum": -9007199254740991,
                        "type": "integer"
                      }
                    },
                    "required": [
                      "num1",
                      "num2"
                    ],
                    "type": "object"
                  }
                },
                "required": [
                  "field",
                  "op",
                  "value"
                ],
                "type": "object"
              }
            ]
          },
          {
            "additionalProperties": false,
            "properties": {
              "field": {
                "const": "date",
                "type": "string"
              },
              "op": {
                "enum": [
                  "is",
                  "isapprox",
                  "gt",
                  "gte",
                  "lt",
                  "lte"
                ],
                "type": "string"
              },
              "options": {
                "additionalProperties": false,
                "properties": {
                  "month": {
                    "type": "boolean"
                  },
                  "year": {
                    "type": "boolean"
                  }
                },
                "type": "object"
              },
              "value": {
                "type": "string"
              }
            },
            "required": [
              "field",
              "op",
              "value"
            ],
            "type": "object"
          },
          {
            "additionalProperties": false,
            "properties": {
              "field": {
                "const": "saved",
                "type": "string"
              },
              "op": {
                "const": "is",
                "type": "string"
              },
              "value": {
                "maxLength": 10000,
                "type": "string"
              }
            },
            "required": [
              "field",
              "op",
              "value"
            ],
            "type": "object"
          },
          {
            "anyOf": [
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "cleared",
                    "type": "string"
                  },
                  "op": {
                    "const": "is",
                    "type": "string"
                  },
                  "value": {
                    "type": "boolean"
                  }
                },
                "required": [
                  "field",
                  "op",
                  "value"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "reconciled",
                    "type": "string"
                  },
                  "op": {
                    "const": "is",
                    "type": "string"
                  },
                  "value": {
                    "type": "boolean"
                  }
                },
                "required": [
                  "field",
                  "op",
                  "value"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "transfer",
                    "type": "string"
                  },
                  "op": {
                    "const": "is",
                    "type": "string"
                  },
                  "value": {
                    "type": "boolean"
                  }
                },
                "required": [
                  "field",
                  "op",
                  "value"
                ],
                "type": "object"
              }
            ]
          }
        ],
        "description": "One supported field/operator/value rule condition."
      },
      "maxItems": 100,
      "minItems": 1,
      "type": "array"
    },
    "conditionsOp": {
      "enum": [
        "and",
        "or"
      ],
      "type": "string"
    },
    "stage": {
      "enum": [
        "pre",
        "default",
        "post"
      ],
      "type": "string"
    }
  },
  "required": [
    "stage",
    "conditionsOp",
    "conditions",
    "actions"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Persisted normalized rule after creation or desired-state update.",
  "properties": {
    "changed": {
      "description": "Whether this call changed persisted Actual state.",
      "type": "boolean"
    },
    "rule": {
      "additionalProperties": false,
      "description": "Complete normalized rule with MCP writability classification.",
      "properties": {
        "actions": {
          "items": {
            "anyOf": [
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "type": "string"
                  },
                  "op": {
                    "const": "set",
                    "type": "string"
                  },
                  "options": {
                    "anyOf": [
                      {
                        "additionalProperties": false,
                        "properties": {
                          "formula": {
                            "type": "string"
                          },
                          "splitIndex": {
                            "maximum": 9007199254740991,
                            "minimum": -9007199254740991,
                            "type": "integer"
                          },
                          "template": {
                            "type": "string"
                          }
                        },
                        "type": "object"
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "type": {
                    "type": "string"
                  },
                  "value": {}
                },
                "required": [
                  "op",
                  "field",
                  "value"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "type": "null"
                  },
                  "op": {
                    "const": "set-split-amount",
                    "type": "string"
                  },
                  "options": {
                    "anyOf": [
                      {
                        "additionalProperties": false,
                        "properties": {
                          "formula": {
                            "type": "string"
                          },
                          "method": {
                            "enum": [
                              "fixed-amount",
                              "fixed-percent",
                              "formula",
                              "remainder"
                            ],
                            "type": "string"
                          },
                          "splitIndex": {
                            "maximum": 9007199254740991,
                            "minimum": -9007199254740991,
                            "type": "integer"
                          }
                        },
                        "required": [
                          "method"
                        ],
                        "type": "object"
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "type": {
                    "type": "string"
                  },
                  "value": {
                    "anyOf": [
                      {
                        "maximum": 9007199254740991,
                        "minimum": -9007199254740991,
                        "type": "integer"
                      },
                      {
                        "type": "null"
                      }
                    ]
                  }
                },
                "required": [
                  "op",
                  "value"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "type": "null"
                  },
                  "op": {
                    "const": "link-schedule",
                    "type": "string"
                  },
                  "type": {
                    "type": "string"
                  },
                  "value": {
                    "maxLength": 512,
                    "minLength": 1,
                    "type": "string"
                  }
                },
                "required": [
                  "op",
                  "value"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "notes",
                    "type": "string"
                  },
                  "op": {
                    "const": "prepend-notes",
                    "type": "string"
                  },
                  "type": {
                    "type": "string"
                  },
                  "value": {
                    "type": "string"
                  }
                },
                "required": [
                  "op",
                  "value"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "notes",
                    "type": "string"
                  },
                  "op": {
                    "const": "append-notes",
                    "type": "string"
                  },
                  "type": {
                    "type": "string"
                  },
                  "value": {
                    "type": "string"
                  }
                },
                "required": [
                  "op",
                  "value"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "type": "null"
                  },
                  "op": {
                    "const": "delete-transaction",
                    "type": "string"
                  },
                  "type": {
                    "type": "string"
                  },
                  "value": {
                    "type": "string"
                  }
                },
                "required": [
                  "op",
                  "value"
                ],
                "type": "object"
              }
            ]
          },
          "type": "array"
        },
        "conditions": {
          "items": {
            "additionalProperties": false,
            "properties": {
              "conditionsOp": {
                "enum": [
                  "and",
                  "or"
                ],
                "type": "string"
              },
              "customName": {
                "type": "string"
              },
              "field": {
                "enum": [
                  "account",
                  "category",
                  "category_group",
                  "amount",
                  "date",
                  "notes",
                  "payee",
                  "imported_payee",
                  "saved",
                  "cleared",
                  "reconciled",
                  "transfer"
                ],
                "type": "string"
              },
              "op": {
                "enum": [
                  "is",
                  "isNot",
                  "oneOf",
                  "notOneOf",
                  "contains",
                  "doesNotContain",
                  "matches",
                  "onBudget",
                  "offBudget",
                  "isapprox",
                  "isbetween",
                  "gt",
                  "gte",
                  "lt",
                  "lte",
                  "hasTags",
                  "hasAnyTag"
                ],
                "type": "string"
              },
              "options": {
                "anyOf": [
                  {
                    "additionalProperties": false,
                    "properties": {
                      "inflow": {
                        "type": "boolean"
                      },
                      "month": {
                        "type": "boolean"
                      },
                      "outflow": {
                        "type": "boolean"
                      },
                      "year": {
                        "type": "boolean"
                      }
                    },
                    "type": "object"
                  },
                  {
                    "type": "null"
                  }
                ]
              },
              "queryFilter": {
                "additionalProperties": {
                  "additionalProperties": false,
                  "properties": {
                    "$oneof": {
                      "items": {
                        "type": "string"
                      },
                      "type": "array"
                    }
                  },
                  "required": [
                    "$oneof"
                  ],
                  "type": "object"
                },
                "propertyNames": {
                  "type": "string"
                },
                "type": "object"
              },
              "type": {
                "enum": [
                  "id",
                  "boolean",
                  "date",
                  "number",
                  "string"
                ],
                "type": "string"
              },
              "value": {}
            },
            "required": [
              "field",
              "op",
              "value"
            ],
            "type": "object"
          },
          "type": "array"
        },
        "conditionsOp": {
          "enum": [
            "and",
            "or"
          ],
          "type": "string"
        },
        "id": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "stage": {
          "enum": [
            "pre",
            "default",
            "post"
          ],
          "type": "string"
        },
        "writable": {
          "type": "boolean"
        },
        "writeRestriction": {
          "type": "string"
        }
      },
      "required": [
        "id",
        "stage",
        "conditionsOp",
        "conditions",
        "actions",
        "writable"
      ],
      "type": "object"
    },
    "success": {
      "const": true,
      "type": "boolean"
    }
  },
  "required": [
    "success",
    "changed",
    "rule"
  ],
  "type": "object"
}
```

</details>

## `actual_create_schedule`

- Title: Create Actual schedule
- Domain: `schedules`
- Description: Create and verify a supported one-time or recurring schedule with explicit amount semantics.
- Capability: `write`
- Mutation-capable: Yes
- Destructive: No
- Idempotent: No
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`, `MAX_ENTITY_NAME_LENGTH`, `MAX_TEXT_LENGTH`, `MAX_SCHEDULE_PATTERNS`
- Runtime guards: `ACTUAL_MCP_READ_ONLY`
- Synchronization: `write-and-sync`
- Partial failure: `sync-after-write`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/write.integration.test.ts` — creates, lists, gets, updates, guards, and deletes an isolated schedule
- Compiled stdio E2E evidence: `test/e2e/write.e2e.test.ts` — runs an isolated schedule lifecycle and destructive kill-switch check through compiled stdio

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Supported schedule creation fields.",
  "properties": {
    "accountId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    },
    "amount": {
      "oneOf": [
        {
          "additionalProperties": false,
          "properties": {
            "amount": {
              "maximum": 9007199254740991,
              "minimum": -9007199254740991,
              "type": "integer"
            },
            "type": {
              "const": "exact",
              "type": "string"
            }
          },
          "required": [
            "type",
            "amount"
          ],
          "type": "object"
        },
        {
          "additionalProperties": false,
          "properties": {
            "amount": {
              "maximum": 9007199254740991,
              "minimum": -9007199254740991,
              "type": "integer"
            },
            "type": {
              "const": "approximate",
              "type": "string"
            }
          },
          "required": [
            "type",
            "amount"
          ],
          "type": "object"
        },
        {
          "additionalProperties": false,
          "properties": {
            "maxAmount": {
              "maximum": 9007199254740991,
              "minimum": -9007199254740991,
              "type": "integer"
            },
            "minAmount": {
              "maximum": 9007199254740991,
              "minimum": -9007199254740991,
              "type": "integer"
            },
            "type": {
              "const": "between",
              "type": "string"
            }
          },
          "required": [
            "type",
            "minAmount",
            "maxAmount"
          ],
          "type": "object"
        }
      ]
    },
    "date": {
      "oneOf": [
        {
          "additionalProperties": false,
          "properties": {
            "date": {
              "type": "string"
            },
            "type": {
              "const": "oneTime",
              "type": "string"
            }
          },
          "required": [
            "type",
            "date"
          ],
          "type": "object"
        },
        {
          "additionalProperties": false,
          "properties": {
            "end": {
              "default": {
                "type": "never"
              },
              "oneOf": [
                {
                  "additionalProperties": false,
                  "properties": {
                    "type": {
                      "const": "never",
                      "type": "string"
                    }
                  },
                  "required": [
                    "type"
                  ],
                  "type": "object"
                },
                {
                  "additionalProperties": false,
                  "properties": {
                    "occurrences": {
                      "exclusiveMinimum": 0,
                      "maximum": 9007199254740991,
                      "type": "integer"
                    },
                    "type": {
                      "const": "afterOccurrences",
                      "type": "string"
                    }
                  },
                  "required": [
                    "type",
                    "occurrences"
                  ],
                  "type": "object"
                },
                {
                  "additionalProperties": false,
                  "properties": {
                    "date": {
                      "type": "string"
                    },
                    "type": {
                      "const": "onDate",
                      "type": "string"
                    }
                  },
                  "required": [
                    "type",
                    "date"
                  ],
                  "type": "object"
                }
              ]
            },
            "frequency": {
              "enum": [
                "daily",
                "weekly",
                "monthly",
                "yearly"
              ],
              "type": "string"
            },
            "interval": {
              "exclusiveMinimum": 0,
              "maximum": 9007199254740991,
              "type": "integer"
            },
            "patterns": {
              "items": {
                "additionalProperties": false,
                "properties": {
                  "type": {
                    "enum": [
                      "day",
                      "SU",
                      "MO",
                      "TU",
                      "WE",
                      "TH",
                      "FR",
                      "SA"
                    ],
                    "type": "string"
                  },
                  "value": {
                    "maximum": 9007199254740991,
                    "minimum": -9007199254740991,
                    "type": "integer"
                  }
                },
                "required": [
                  "type",
                  "value"
                ],
                "type": "object"
              },
              "maxItems": 31,
              "minItems": 1,
              "type": "array"
            },
            "start": {
              "type": "string"
            },
            "type": {
              "const": "recurring",
              "type": "string"
            },
            "weekend": {
              "default": "none",
              "enum": [
                "none",
                "before",
                "after"
              ],
              "type": "string"
            }
          },
          "required": [
            "type",
            "frequency",
            "start",
            "interval"
          ],
          "type": "object"
        }
      ]
    },
    "name": {
      "maxLength": 255,
      "minLength": 1,
      "type": "string"
    },
    "payeeId": {
      "anyOf": [
        {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        {
          "type": "null"
        }
      ]
    },
    "postsTransaction": {
      "type": "boolean"
    }
  },
  "required": [
    "accountId",
    "amount",
    "date",
    "postsTransaction"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Verified schedule mutation result.",
  "properties": {
    "changed": {
      "type": "boolean"
    },
    "changedFields": {
      "items": {
        "type": "string"
      },
      "type": "array"
    },
    "schedule": {
      "additionalProperties": false,
      "description": "Stable schedule projection without protected rule internals.",
      "properties": {
        "accountId": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "amount": {
          "anyOf": [
            {
              "oneOf": [
                {
                  "additionalProperties": false,
                  "properties": {
                    "amount": {
                      "maximum": 9007199254740991,
                      "minimum": -9007199254740991,
                      "type": "integer"
                    },
                    "type": {
                      "const": "exact",
                      "type": "string"
                    }
                  },
                  "required": [
                    "type",
                    "amount"
                  ],
                  "type": "object"
                },
                {
                  "additionalProperties": false,
                  "properties": {
                    "amount": {
                      "maximum": 9007199254740991,
                      "minimum": -9007199254740991,
                      "type": "integer"
                    },
                    "type": {
                      "const": "approximate",
                      "type": "string"
                    }
                  },
                  "required": [
                    "type",
                    "amount"
                  ],
                  "type": "object"
                },
                {
                  "additionalProperties": false,
                  "properties": {
                    "maxAmount": {
                      "maximum": 9007199254740991,
                      "minimum": -9007199254740991,
                      "type": "integer"
                    },
                    "minAmount": {
                      "maximum": 9007199254740991,
                      "minimum": -9007199254740991,
                      "type": "integer"
                    },
                    "type": {
                      "const": "between",
                      "type": "string"
                    }
                  },
                  "required": [
                    "type",
                    "minAmount",
                    "maxAmount"
                  ],
                  "type": "object"
                }
              ]
            },
            {
              "type": "null"
            }
          ]
        },
        "completed": {
          "type": "boolean"
        },
        "date": {
          "anyOf": [
            {
              "oneOf": [
                {
                  "additionalProperties": false,
                  "properties": {
                    "date": {
                      "type": "string"
                    },
                    "type": {
                      "const": "oneTime",
                      "type": "string"
                    }
                  },
                  "required": [
                    "type",
                    "date"
                  ],
                  "type": "object"
                },
                {
                  "additionalProperties": false,
                  "properties": {
                    "end": {
                      "default": {
                        "type": "never"
                      },
                      "oneOf": [
                        {
                          "additionalProperties": false,
                          "properties": {
                            "type": {
                              "const": "never",
                              "type": "string"
                            }
                          },
                          "required": [
                            "type"
                          ],
                          "type": "object"
                        },
                        {
                          "additionalProperties": false,
                          "properties": {
                            "occurrences": {
                              "exclusiveMinimum": 0,
                              "maximum": 9007199254740991,
                              "type": "integer"
                            },
                            "type": {
                              "const": "afterOccurrences",
                              "type": "string"
                            }
                          },
                          "required": [
                            "type",
                            "occurrences"
                          ],
                          "type": "object"
                        },
                        {
                          "additionalProperties": false,
                          "properties": {
                            "date": {
                              "type": "string"
                            },
                            "type": {
                              "const": "onDate",
                              "type": "string"
                            }
                          },
                          "required": [
                            "type",
                            "date"
                          ],
                          "type": "object"
                        }
                      ]
                    },
                    "frequency": {
                      "enum": [
                        "daily",
                        "weekly",
                        "monthly",
                        "yearly"
                      ],
                      "type": "string"
                    },
                    "interval": {
                      "exclusiveMinimum": 0,
                      "maximum": 9007199254740991,
                      "type": "integer"
                    },
                    "patterns": {
                      "items": {
                        "additionalProperties": false,
                        "properties": {
                          "type": {
                            "enum": [
                              "day",
                              "SU",
                              "MO",
                              "TU",
                              "WE",
                              "TH",
                              "FR",
                              "SA"
                            ],
                            "type": "string"
                          },
                          "value": {
                            "maximum": 9007199254740991,
                            "minimum": -9007199254740991,
                            "type": "integer"
                          }
                        },
                        "required": [
                          "type",
                          "value"
                        ],
                        "type": "object"
                      },
                      "minItems": 1,
                      "type": "array"
                    },
                    "start": {
                      "type": "string"
                    },
                    "type": {
                      "const": "recurring",
                      "type": "string"
                    },
                    "weekend": {
                      "default": "none",
                      "enum": [
                        "none",
                        "before",
                        "after"
                      ],
                      "type": "string"
                    }
                  },
                  "required": [
                    "type",
                    "frequency",
                    "start",
                    "interval",
                    "weekend",
                    "end"
                  ],
                  "type": "object"
                }
              ]
            },
            {
              "type": "null"
            }
          ]
        },
        "id": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "name": {
          "type": "string"
        },
        "nextDate": {
          "type": "string"
        },
        "payeeId": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "postsTransaction": {
          "type": "boolean"
        },
        "unsupportedReasons": {
          "items": {
            "type": "string"
          },
          "type": "array"
        },
        "writable": {
          "type": "boolean"
        }
      },
      "required": [
        "id",
        "accountId",
        "payeeId",
        "amount",
        "date",
        "completed",
        "postsTransaction",
        "writable",
        "unsupportedReasons"
      ],
      "type": "object"
    },
    "success": {
      "const": true,
      "type": "boolean"
    }
  },
  "required": [
    "success",
    "changed",
    "schedule"
  ],
  "type": "object"
}
```

</details>

## `actual_create_transfer`

- Title: Preview or create an Actual transfer
- Domain: `transfers`
- Description: Preview by default; creation requires dryRun false and confirmWrite true and is non-idempotent.
- Capability: `write`
- Mutation-capable: Yes
- Destructive: No
- Idempotent: No
- Confirmation: `confirm-write`
- Bounds: `MAX_ID_LENGTH`, `MAX_ENTITY_NAME_LENGTH`, `MAX_TEXT_LENGTH`, `MAX_LEDGER_SCAN_RESULTS`, `LEDGER_QUERY_SENTINEL_LIMIT`
- Runtime guards: `ACTUAL_MCP_READ_ONLY`
- Synchronization: `write-and-sync`
- Partial failure: `multi-step`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/write.integration.test.ts` — previews, creates, verifies, owns, and deletes one reciprocal transfer pair
- Compiled stdio E2E evidence: `test/e2e/write.e2e.test.ts` — previews, creates, verifies, owns, and deletes one reciprocal transfer through compiled stdio

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Manual transfer preview or explicitly confirmed creation request.",
  "properties": {
    "amount": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    },
    "categoryId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    },
    "confirmWrite": {
      "type": "boolean"
    },
    "date": {
      "type": "string"
    },
    "dryRun": {
      "default": true,
      "type": "boolean"
    },
    "fromAccountId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    },
    "fromCleared": {
      "default": false,
      "type": "boolean"
    },
    "notes": {
      "maxLength": 10000,
      "type": "string"
    },
    "toAccountId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    },
    "toCleared": {
      "default": false,
      "type": "boolean"
    }
  },
  "required": [
    "fromAccountId",
    "toAccountId",
    "amount",
    "date"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$defs": {
    "__schema0": {
      "additionalProperties": false,
      "description": "Normalized Actual transaction. Explicit null values from Actual are preserved; absent optional fields remain absent.",
      "properties": {
        "account": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "amount": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "category": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "category_name": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "cleared": {
          "type": "boolean"
        },
        "date": {
          "type": "string"
        },
        "id": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "imported_id": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "imported_payee": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "is_child": {
          "type": "boolean"
        },
        "is_parent": {
          "type": "boolean"
        },
        "isTransfer": {
          "type": "boolean"
        },
        "notes": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "parent_id": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "payee": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "payee_name": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "reconciled": {
          "type": "boolean"
        },
        "starting_balance_flag": {
          "type": "boolean"
        },
        "subtransactions": {
          "items": {
            "$ref": "#/$defs/__schema0"
          },
          "type": "array"
        },
        "transfer_id": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "id",
        "account",
        "date",
        "amount"
      ],
      "type": "object"
    }
  },
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Exact transfer plan and verified creation phase evidence.",
  "properties": {
    "anchorAccountId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    },
    "dryRun": {
      "type": "boolean"
    },
    "executed": {
      "type": "boolean"
    },
    "fromSide": {
      "additionalProperties": false,
      "properties": {
        "accountId": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "amount": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "categoryId": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "cleared": {
          "type": "boolean"
        },
        "notes": {
          "type": "string"
        },
        "payeeId": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        }
      },
      "required": [
        "accountId",
        "amount",
        "payeeId",
        "categoryId",
        "cleared"
      ],
      "type": "object"
    },
    "pair": {
      "anyOf": [
        {
          "additionalProperties": false,
          "description": "Canonical observed reciprocal transfer pair and deterministic integrity evidence.",
          "properties": {
            "fromTransaction": {
              "anyOf": [
                {
                  "$ref": "#/$defs/__schema0"
                },
                {
                  "type": "null"
                }
              ]
            },
            "integrity": {
              "enum": [
                "VALID",
                "INVALID"
              ],
              "type": "string"
            },
            "magnitude": {
              "anyOf": [
                {
                  "maximum": 9007199254740991,
                  "minimum": -9007199254740991,
                  "type": "integer"
                },
                {
                  "type": "null"
                }
              ]
            },
            "pairKey": {
              "pattern": "^v1:[a-f0-9]{64}$",
              "type": "string"
            },
            "reasonCodes": {
              "items": {
                "enum": [
                  "MISSING_COUNTERPART",
                  "NON_RECIPROCAL_RELATIONSHIP",
                  "SAME_ACCOUNT",
                  "ZERO_AMOUNT",
                  "SAME_SIGN",
                  "MAGNITUDE_MISMATCH",
                  "MALFORMED_RELATIONSHIP_ID"
                ],
                "type": "string"
              },
              "type": "array"
            },
            "toTransaction": {
              "anyOf": [
                {
                  "$ref": "#/$defs/__schema0"
                },
                {
                  "type": "null"
                }
              ]
            },
            "transactionA": {
              "anyOf": [
                {
                  "$ref": "#/$defs/__schema0"
                },
                {
                  "type": "null"
                }
              ]
            },
            "transactionB": {
              "anyOf": [
                {
                  "$ref": "#/$defs/__schema0"
                },
                {
                  "type": "null"
                }
              ]
            }
          },
          "required": [
            "pairKey",
            "transactionA",
            "transactionB",
            "integrity",
            "reasonCodes",
            "fromTransaction",
            "toTransaction",
            "magnitude"
          ],
          "type": "object"
        },
        {
          "type": "null"
        }
      ]
    },
    "phase": {
      "enum": [
        "preflight",
        "created_unverified",
        "pair_discovered",
        "side_updates_applied",
        "synchronized",
        "verified"
      ],
      "type": "string"
    },
    "synchronized": {
      "type": "boolean"
    },
    "toSide": {
      "additionalProperties": false,
      "properties": {
        "accountId": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "amount": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "categoryId": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "cleared": {
          "type": "boolean"
        },
        "notes": {
          "type": "string"
        },
        "payeeId": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        }
      },
      "required": [
        "accountId",
        "amount",
        "payeeId",
        "categoryId",
        "cleared"
      ],
      "type": "object"
    },
    "verified": {
      "type": "boolean"
    }
  },
  "required": [
    "dryRun",
    "executed",
    "synchronized",
    "verified",
    "phase",
    "anchorAccountId",
    "fromSide",
    "toSide",
    "pair"
  ],
  "type": "object"
}
```

</details>

## `actual_delete_account`

- Title: Delete empty Actual account
- Domain: `accounts`
- Description: DESTRUCTIVE OPERATION: Permanently delete an account only after literal confirmation and complete history proves it is empty.
- Capability: `destructive`
- Mutation-capable: Yes
- Destructive: Yes
- Idempotent: No
- Confirmation: `confirm-destructive`
- Bounds: `MAX_ID_LENGTH`
- Runtime guards: `ACTUAL_MCP_READ_ONLY`, then `ACTUAL_MCP_ALLOW_DESTRUCTIVE`
- Synchronization: `write-and-sync`
- Partial failure: `sync-after-write`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/write.integration.test.ts` — administers isolated account and category structure with exact-ID cleanup and complete safety preflights
- Compiled stdio E2E evidence: `test/e2e/write.e2e.test.ts` — exercises the complete structural lifecycle through real MCP stdio

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "DESTRUCTIVE OPERATION input for deleting one proven-empty account.",
  "properties": {
    "accountId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    },
    "confirmDestructive": {
      "const": true,
      "type": "boolean"
    }
  },
  "required": [
    "accountId",
    "confirmDestructive"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Immutable summary of a confirmed empty-account deletion.",
  "properties": {
    "deletedAccountId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    },
    "deletedAccountName": {
      "type": "string"
    },
    "relatedTransactionCount": {
      "const": 0,
      "type": "number"
    },
    "success": {
      "const": true,
      "type": "boolean"
    }
  },
  "required": [
    "success",
    "deletedAccountId",
    "deletedAccountName",
    "relatedTransactionCount"
  ],
  "type": "object"
}
```

</details>

## `actual_delete_category`

- Title: Delete unused Actual category
- Domain: `categories`
- Description: DESTRUCTIVE OPERATION: Permanently delete a category only after literal confirmation and complete transaction and budget scans prove it is unused.
- Capability: `destructive`
- Mutation-capable: Yes
- Destructive: Yes
- Idempotent: No
- Confirmation: `confirm-destructive`
- Bounds: `MAX_ID_LENGTH`, `MAX_ENTITY_NAME_LENGTH`
- Runtime guards: `ACTUAL_MCP_READ_ONLY`, then `ACTUAL_MCP_ALLOW_DESTRUCTIVE`
- Synchronization: `write-and-sync`
- Partial failure: `sync-after-write`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/write.integration.test.ts` — administers isolated account and category structure with exact-ID cleanup and complete safety preflights
- Compiled stdio E2E evidence: `test/e2e/write.e2e.test.ts` — exercises the complete structural lifecycle through real MCP stdio

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "DESTRUCTIVE OPERATION input for deleting one proven-unused category.",
  "properties": {
    "categoryId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    },
    "confirmDestructive": {
      "const": true,
      "type": "boolean"
    }
  },
  "required": [
    "categoryId",
    "confirmDestructive"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Immutable summary of a confirmed unused-category deletion.",
  "properties": {
    "deletedCategoryId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    },
    "deletedCategoryName": {
      "type": "string"
    },
    "relatedBudgetMonthCount": {
      "const": 0,
      "type": "number"
    },
    "relatedCarryoverMonthCount": {
      "const": 0,
      "type": "number"
    },
    "relatedTransactionCount": {
      "const": 0,
      "type": "number"
    },
    "success": {
      "const": true,
      "type": "boolean"
    }
  },
  "required": [
    "success",
    "deletedCategoryId",
    "deletedCategoryName",
    "relatedTransactionCount",
    "relatedBudgetMonthCount",
    "relatedCarryoverMonthCount"
  ],
  "type": "object"
}
```

</details>

## `actual_delete_category_group`

- Title: Delete empty Actual category group
- Domain: `categories`
- Description: DESTRUCTIVE OPERATION: Permanently delete a category group only after literal confirmation and a complete read proves it has no categories.
- Capability: `destructive`
- Mutation-capable: Yes
- Destructive: Yes
- Idempotent: No
- Confirmation: `confirm-destructive`
- Bounds: `MAX_ID_LENGTH`, `MAX_ENTITY_NAME_LENGTH`
- Runtime guards: `ACTUAL_MCP_READ_ONLY`, then `ACTUAL_MCP_ALLOW_DESTRUCTIVE`
- Synchronization: `write-and-sync`
- Partial failure: `sync-after-write`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/write.integration.test.ts` — administers isolated account and category structure with exact-ID cleanup and complete safety preflights
- Compiled stdio E2E evidence: `test/e2e/write.e2e.test.ts` — exercises the complete structural lifecycle through real MCP stdio

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "DESTRUCTIVE OPERATION input for deleting one proven-empty category group.",
  "properties": {
    "confirmDestructive": {
      "const": true,
      "type": "boolean"
    },
    "groupId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    }
  },
  "required": [
    "groupId",
    "confirmDestructive"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Immutable summary of a confirmed empty category-group deletion.",
  "properties": {
    "deletedCategoryGroupId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    },
    "deletedCategoryGroupName": {
      "type": "string"
    },
    "relatedCategoryCount": {
      "const": 0,
      "type": "number"
    },
    "success": {
      "const": true,
      "type": "boolean"
    }
  },
  "required": [
    "success",
    "deletedCategoryGroupId",
    "deletedCategoryGroupName",
    "relatedCategoryCount"
  ],
  "type": "object"
}
```

</details>

## `actual_delete_payee`

- Title: Delete unused Actual payee
- Domain: `payees`
- Description: DESTRUCTIVE OPERATION: Preflight all transaction and rule references, then delete one proven-unused ordinary payee only with literal confirmation.
- Capability: `destructive`
- Mutation-capable: Yes
- Destructive: Yes
- Idempotent: No
- Confirmation: `confirm-destructive`
- Bounds: `MAX_ID_LENGTH`, `MAX_ENTITY_NAME_LENGTH`
- Runtime guards: `ACTUAL_MCP_READ_ONLY`, then `ACTUAL_MCP_ALLOW_DESTRUCTIVE`
- Synchronization: `write-and-sync`
- Partial failure: `sync-after-write`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/write.integration.test.ts` — runs the guarded real payee create, read, rename, preflight, and delete lifecycle
- Compiled stdio E2E evidence: `test/e2e/write.e2e.test.ts` — runs a restart-safe payee lifecycle through MCP-only calls

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "DESTRUCTIVE OPERATION input for deleting one proven-unused ordinary payee.",
  "properties": {
    "confirmDestructive": {
      "const": true,
      "type": "boolean"
    },
    "payeeId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    }
  },
  "required": [
    "payeeId",
    "confirmDestructive"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Immutable summary of a confirmed unused-payee deletion.",
  "properties": {
    "deletedPayeeId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    },
    "deletedPayeeName": {
      "type": "string"
    },
    "relatedRuleCount": {
      "const": 0,
      "type": "number"
    },
    "relatedTransactionCount": {
      "const": 0,
      "type": "number"
    },
    "success": {
      "const": true,
      "type": "boolean"
    }
  },
  "required": [
    "success",
    "deletedPayeeId",
    "deletedPayeeName",
    "relatedTransactionCount",
    "relatedRuleCount"
  ],
  "type": "object"
}
```

</details>

## `actual_delete_rule`

- Title: Delete Actual rule
- Domain: `rules`
- Description: DESTRUCTIVE OPERATION: Delete one identified rule only with literal confirmation and respect Actual-protected rules.
- Capability: `destructive`
- Mutation-capable: Yes
- Destructive: Yes
- Idempotent: No
- Confirmation: `confirm-destructive`
- Bounds: `MAX_ID_LENGTH`, `MAX_TEXT_LENGTH`
- Runtime guards: `ACTUAL_MCP_READ_ONLY`, then `ACTUAL_MCP_ALLOW_DESTRUCTIVE`
- Synchronization: `write-and-sync`
- Partial failure: `sync-after-write`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/write.integration.test.ts` — persists, updates, functionally executes, and deletes a uniquely owned rule
- Compiled stdio E2E evidence: `test/e2e/write.e2e.test.ts` — creates, updates, functionally executes, and deletes a rule using only MCP tool calls

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "DESTRUCTIVE OPERATION input for deleting one identified rule.",
  "properties": {
    "confirmDestructive": {
      "const": true,
      "type": "boolean"
    },
    "ruleId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    }
  },
  "required": [
    "ruleId",
    "confirmDestructive"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Immutable result of one confirmed protected rule deletion.",
  "properties": {
    "deletedRuleId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    },
    "success": {
      "const": true,
      "type": "boolean"
    }
  },
  "required": [
    "success",
    "deletedRuleId"
  ],
  "type": "object"
}
```

</details>

## `actual_delete_schedule`

- Title: Delete Actual schedule
- Domain: `schedules`
- Description: DESTRUCTIVE OPERATION: Delete one schedule after confirmation while verifying historical transactions remain.
- Capability: `destructive`
- Mutation-capable: Yes
- Destructive: Yes
- Idempotent: No
- Confirmation: `confirm-destructive`
- Bounds: `MAX_ID_LENGTH`, `MAX_ENTITY_NAME_LENGTH`, `MAX_TEXT_LENGTH`, `MAX_LEDGER_SCAN_RESULTS`, `LEDGER_QUERY_SENTINEL_LIMIT`
- Runtime guards: `ACTUAL_MCP_READ_ONLY`, then `ACTUAL_MCP_ALLOW_DESTRUCTIVE`
- Synchronization: `write-and-sync`
- Partial failure: `sync-after-write`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/write.integration.test.ts` — creates, lists, gets, updates, guards, and deletes an isolated schedule
- Compiled stdio E2E evidence: `test/e2e/write.e2e.test.ts` — runs an isolated schedule lifecycle and destructive kill-switch check through compiled stdio

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Confirmed schedule deletion.",
  "properties": {
    "confirmDestructive": {
      "const": true,
      "type": "boolean"
    },
    "scheduleId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    }
  },
  "required": [
    "scheduleId",
    "confirmDestructive"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Verified schedule deletion and historical-transaction preservation.",
  "properties": {
    "deletedScheduleId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    },
    "deletedScheduleName": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ]
    },
    "historicalTransactionsPreserved": {
      "const": true,
      "type": "boolean"
    },
    "linkedTransactionIds": {
      "items": {
        "maxLength": 512,
        "minLength": 1,
        "type": "string"
      },
      "type": "array"
    },
    "success": {
      "const": true,
      "type": "boolean"
    }
  },
  "required": [
    "success",
    "deletedScheduleId",
    "deletedScheduleName",
    "linkedTransactionIds",
    "historicalTransactionsPreserved"
  ],
  "type": "object"
}
```

</details>

## `actual_delete_transaction`

- Title: Delete Actual transaction
- Domain: `transactions`
- Description: DESTRUCTIVE OPERATION: Permanently delete one Actual transaction only after explicit confirmation, then synchronize.
- Capability: `destructive`
- Mutation-capable: Yes
- Destructive: Yes
- Idempotent: No
- Confirmation: `confirm-destructive`
- Bounds: `MAX_ID_LENGTH`, `MAX_TEXT_LENGTH`
- Runtime guards: `ACTUAL_MCP_READ_ONLY`, then `ACTUAL_MCP_ALLOW_DESTRUCTIVE`
- Synchronization: `write-and-sync`
- Partial failure: `sync-after-write`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/write.integration.test.ts` — deletes only the captured, UUID-owned transaction
- Compiled stdio E2E evidence: `test/e2e/write.e2e.test.ts` — deletes only the captured transaction after destructive confirmation

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Target transaction and literal destructive confirmation.",
  "properties": {
    "confirmDestructive": {
      "const": true,
      "type": "boolean"
    },
    "transactionId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    }
  },
  "required": [
    "transactionId",
    "confirmDestructive"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Successful synchronized transaction mutation.",
  "properties": {
    "affectedTransactionIds": {
      "items": {
        "maxLength": 512,
        "minLength": 1,
        "type": "string"
      },
      "type": "array"
    },
    "counterpartTransactionId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    },
    "deletedTransferPair": {
      "type": "boolean"
    },
    "linkedTransferAffected": {
      "type": "boolean"
    },
    "mirroredFields": {
      "items": {
        "enum": [
          "category",
          "payee",
          "notes",
          "cleared",
          "date",
          "amount"
        ],
        "type": "string"
      },
      "type": "array"
    },
    "success": {
      "const": true,
      "type": "boolean"
    },
    "transactionId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    },
    "verified": {
      "type": "boolean"
    }
  },
  "required": [
    "success",
    "transactionId"
  ],
  "type": "object"
}
```

</details>

## `actual_find_possible_duplicates`

- Title: Find possible duplicate Actual transactions
- Domain: `transactions`
- Description: Classify bounded same-account duplicate candidates without merge, deletion, or mutation.
- Capability: `read`
- Mutation-capable: No
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`, `MAX_TRANSACTION_SEARCH_RESULTS`, `MAX_TRANSACTION_SEARCH_OFFSET`, `MAX_DIAGNOSTIC_WINDOW_DAYS`, `MAX_LEDGER_SCAN_RESULTS`, `LEDGER_QUERY_SENTINEL_LIMIT`
- Runtime guards: None
- Synchronization: `none`
- Partial failure: `none`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/read.integration.test.ts` — performs exact lookup and typed cross-account search through the installed query path
- Compiled stdio E2E evidence: `test/e2e/read.e2e.test.ts` — executes exact lookup and advanced search filters, ordering, pagination, totals, and split modes through compiled stdio

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Bounded read-only possible-duplicate diagnostic request.",
  "properties": {
    "accountIds": {
      "items": {
        "maxLength": 512,
        "minLength": 1,
        "type": "string"
      },
      "maxItems": 250,
      "minItems": 1,
      "type": "array"
    },
    "classification": {
      "default": "any",
      "enum": [
        "any",
        "STRONG",
        "LIKELY"
      ],
      "type": "string"
    },
    "dateWindowDays": {
      "default": 3,
      "maximum": 7,
      "minimum": 0,
      "type": "integer"
    },
    "endDate": {
      "type": "string"
    },
    "limit": {
      "default": 100,
      "maximum": 250,
      "minimum": 1,
      "type": "integer"
    },
    "maxMagnitude": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    },
    "minMagnitude": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    },
    "offset": {
      "default": 0,
      "maximum": 10000,
      "minimum": 0,
      "type": "integer"
    },
    "sort": {
      "default": "date_desc",
      "enum": [
        "date_desc",
        "date_asc",
        "magnitude_desc",
        "magnitude_asc"
      ],
      "type": "string"
    },
    "startDate": {
      "type": "string"
    }
  },
  "required": [
    "startDate",
    "endDate"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$defs": {
    "__schema0": {
      "additionalProperties": false,
      "description": "Normalized Actual transaction. Explicit null values from Actual are preserved; absent optional fields remain absent.",
      "properties": {
        "account": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "amount": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "category": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "category_name": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "cleared": {
          "type": "boolean"
        },
        "date": {
          "type": "string"
        },
        "id": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "imported_id": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "imported_payee": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "is_child": {
          "type": "boolean"
        },
        "is_parent": {
          "type": "boolean"
        },
        "isTransfer": {
          "type": "boolean"
        },
        "notes": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "parent_id": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "payee": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "payee_name": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "reconciled": {
          "type": "boolean"
        },
        "starting_balance_flag": {
          "type": "boolean"
        },
        "subtransactions": {
          "items": {
            "$ref": "#/$defs/__schema0"
          },
          "type": "array"
        },
        "transfer_id": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "id",
        "account",
        "date",
        "amount"
      ],
      "type": "object"
    }
  },
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Possible duplicate candidates with deterministic evidence and complete counts.",
  "properties": {
    "candidates": {
      "items": {
        "additionalProperties": false,
        "properties": {
          "candidateKey": {
            "pattern": "^v1:[a-f0-9]{64}$",
            "type": "string"
          },
          "classification": {
            "enum": [
              "STRONG",
              "LIKELY"
            ],
            "type": "string"
          },
          "dateDifferenceDays": {
            "maximum": 9007199254740991,
            "minimum": 0,
            "type": "integer"
          },
          "reasonCodes": {
            "items": {
              "enum": [
                "SAME_IMPORTED_ID",
                "SAME_DATE",
                "SAME_PAYEE",
                "SAME_IMPORTED_PAYEE",
                "DATE_WITHIN_WINDOW"
              ],
              "type": "string"
            },
            "type": "array"
          },
          "transactionA": {
            "$ref": "#/$defs/__schema0"
          },
          "transactionB": {
            "$ref": "#/$defs/__schema0"
          }
        },
        "required": [
          "candidateKey",
          "transactionA",
          "transactionB",
          "dateDifferenceDays",
          "classification",
          "reasonCodes"
        ],
        "type": "object"
      },
      "type": "array"
    },
    "counts": {
      "additionalProperties": false,
      "properties": {
        "likely": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        },
        "matched": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        },
        "strong": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        }
      },
      "required": [
        "matched",
        "strong",
        "likely"
      ],
      "type": "object"
    },
    "page": {
      "additionalProperties": false,
      "properties": {
        "limit": {
          "exclusiveMinimum": 0,
          "maximum": 9007199254740991,
          "type": "integer"
        },
        "offset": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        },
        "returned": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        }
      },
      "required": [
        "limit",
        "offset",
        "returned"
      ],
      "type": "object"
    }
  },
  "required": [
    "candidates",
    "counts",
    "page"
  ],
  "type": "object"
}
```

</details>

## `actual_find_possible_transfers`

- Title: Find possible unlinked Actual transfers
- Domain: `transfers`
- Description: Classify bounded opposite-amount cross-account candidates without linking or mutation.
- Capability: `read`
- Mutation-capable: No
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`, `MAX_TEXT_LENGTH`, `MAX_DATE_RANGE_DAYS`, `MAX_TRANSACTION_SEARCH_RESULTS`, `MAX_TRANSACTION_SEARCH_OFFSET`, `MAX_DIAGNOSTIC_WINDOW_DAYS`, `MAX_LEDGER_SCAN_RESULTS`, `LEDGER_QUERY_SENTINEL_LIMIT`
- Runtime guards: None
- Synchronization: `none`
- Partial failure: `none`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/read.integration.test.ts` — reads transfer payees, transfer search, diagnostics, and reconciliation without mutation
- Compiled stdio E2E evidence: `test/e2e/read.e2e.test.ts` — exercises transfer, diagnostic, and reconciliation reads through compiled stdio

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Bounded read-only possible-transfer diagnostic request.",
  "properties": {
    "accountIds": {
      "items": {
        "maxLength": 512,
        "minLength": 1,
        "type": "string"
      },
      "maxItems": 250,
      "minItems": 1,
      "type": "array"
    },
    "classification": {
      "default": "any",
      "enum": [
        "any",
        "UNIQUE",
        "AMBIGUOUS"
      ],
      "type": "string"
    },
    "dateWindowDays": {
      "default": 3,
      "maximum": 7,
      "minimum": 0,
      "type": "integer"
    },
    "endDate": {
      "type": "string"
    },
    "limit": {
      "default": 100,
      "maximum": 250,
      "minimum": 1,
      "type": "integer"
    },
    "maxMagnitude": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    },
    "minMagnitude": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    },
    "offset": {
      "default": 0,
      "maximum": 10000,
      "minimum": 0,
      "type": "integer"
    },
    "sort": {
      "default": "date_desc",
      "enum": [
        "date_desc",
        "date_asc",
        "magnitude_desc",
        "magnitude_asc"
      ],
      "type": "string"
    },
    "startDate": {
      "type": "string"
    }
  },
  "required": [
    "startDate",
    "endDate"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$defs": {
    "__schema0": {
      "additionalProperties": false,
      "description": "Normalized Actual transaction. Explicit null values from Actual are preserved; absent optional fields remain absent.",
      "properties": {
        "account": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "amount": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "category": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "category_name": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "cleared": {
          "type": "boolean"
        },
        "date": {
          "type": "string"
        },
        "id": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "imported_id": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "imported_payee": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "is_child": {
          "type": "boolean"
        },
        "is_parent": {
          "type": "boolean"
        },
        "isTransfer": {
          "type": "boolean"
        },
        "notes": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "parent_id": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "payee": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "payee_name": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "reconciled": {
          "type": "boolean"
        },
        "starting_balance_flag": {
          "type": "boolean"
        },
        "subtransactions": {
          "items": {
            "$ref": "#/$defs/__schema0"
          },
          "type": "array"
        },
        "transfer_id": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "id",
        "account",
        "date",
        "amount"
      ],
      "type": "object"
    }
  },
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Possible unlinked transfer candidates with graph classification and complete counts.",
  "properties": {
    "candidates": {
      "items": {
        "additionalProperties": false,
        "properties": {
          "candidateKey": {
            "pattern": "^v1:[a-f0-9]{64}$",
            "type": "string"
          },
          "classification": {
            "enum": [
              "UNIQUE",
              "AMBIGUOUS"
            ],
            "type": "string"
          },
          "dateDifferenceDays": {
            "maximum": 9007199254740991,
            "minimum": 0,
            "type": "integer"
          },
          "leftCandidateCount": {
            "exclusiveMinimum": 0,
            "maximum": 9007199254740991,
            "type": "integer"
          },
          "reasonCodes": {
            "items": {
              "enum": [
                "OPPOSITE_AMOUNT",
                "SAME_DATE",
                "DATE_WITHIN_WINDOW"
              ],
              "type": "string"
            },
            "type": "array"
          },
          "rightCandidateCount": {
            "exclusiveMinimum": 0,
            "maximum": 9007199254740991,
            "type": "integer"
          },
          "transactionA": {
            "$ref": "#/$defs/__schema0"
          },
          "transactionB": {
            "$ref": "#/$defs/__schema0"
          }
        },
        "required": [
          "candidateKey",
          "transactionA",
          "transactionB",
          "dateDifferenceDays",
          "classification",
          "leftCandidateCount",
          "rightCandidateCount",
          "reasonCodes"
        ],
        "type": "object"
      },
      "type": "array"
    },
    "counts": {
      "additionalProperties": false,
      "properties": {
        "ambiguous": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        },
        "matched": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        },
        "unique": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        }
      },
      "required": [
        "matched",
        "unique",
        "ambiguous"
      ],
      "type": "object"
    },
    "page": {
      "additionalProperties": false,
      "properties": {
        "limit": {
          "exclusiveMinimum": 0,
          "maximum": 9007199254740991,
          "type": "integer"
        },
        "offset": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        },
        "returned": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        }
      },
      "required": [
        "limit",
        "offset",
        "returned"
      ],
      "type": "object"
    }
  },
  "required": [
    "candidates",
    "counts",
    "page"
  ],
  "type": "object"
}
```

</details>

## `actual_get_account`

- Title: Get Actual account
- Domain: `accounts`
- Description: Get one Actual account by its opaque identifier, including its official ledger balance.
- Capability: `read`
- Mutation-capable: No
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`
- Runtime guards: None
- Synchronization: `none`
- Partial failure: `none`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/read.integration.test.ts` — finds both dedicated accounts by name and validates normalized account output
- Compiled stdio E2E evidence: `test/e2e/read.e2e.test.ts` — calls health, accounts, categories, and payees with matching structured and JSON content

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Opaque identifier of the requested account.",
  "properties": {
    "accountId": {
      "description": "Opaque Actual account identifier.",
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    }
  },
  "required": [
    "accountId"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "The requested Actual account and available ledger balance.",
  "properties": {
    "account": {
      "additionalProperties": false,
      "description": "Normalized Actual account.",
      "properties": {
        "balance": {
          "description": "Ledger balance in integer minor units.",
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "balanceError": {
          "description": "Sanitized balance lookup error, when balance retrieval failed.",
          "type": "string"
        },
        "closed": {
          "description": "Whether the account is closed.",
          "type": "boolean"
        },
        "id": {
          "description": "Opaque Actual account identifier.",
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "name": {
          "description": "User-authored account name, returned verbatim.",
          "type": "string"
        },
        "offbudget": {
          "description": "Whether the account is excluded from the budget.",
          "type": "boolean"
        }
      },
      "required": [
        "id",
        "name",
        "offbudget",
        "closed"
      ],
      "type": "object"
    }
  },
  "required": [
    "account"
  ],
  "type": "object"
}
```

</details>

## `actual_get_account_reconciliation`

- Title: Get Actual account reconciliation diagnostics
- Domain: `reconciliation`
- Description: Compute a read-only split-safe cutoff snapshot with optional signed statement differences.
- Capability: `read`
- Mutation-capable: No
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`, `MAX_DATE_RANGE_DAYS`, `MAX_LEDGER_SCAN_RESULTS`, `LEDGER_QUERY_SENTINEL_LIMIT`
- Runtime guards: None
- Synchronization: `none`
- Partial failure: `none`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/read.integration.test.ts` — reads transfer payees, transfer search, diagnostics, and reconciliation without mutation
- Compiled stdio E2E evidence: `test/e2e/read.e2e.test.ts` — exercises transfer, diagnostic, and reconciliation reads through compiled stdio

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Exact account, optional cutoff, and optional signed statement balance.",
  "properties": {
    "accountId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    },
    "cutoff": {
      "type": "string"
    },
    "statementBalance": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    }
  },
  "required": [
    "accountId"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Split-safe read-only ledger, statement, and bank metadata reconciliation snapshot.",
  "properties": {
    "account": {
      "additionalProperties": false,
      "properties": {
        "id": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "name": {
          "type": "string"
        }
      },
      "required": [
        "id",
        "name"
      ],
      "type": "object"
    },
    "balances": {
      "additionalProperties": false,
      "properties": {
        "cleared": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "ledger": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "reconciled": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "uncleared": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        }
      },
      "required": [
        "ledger",
        "cleared",
        "reconciled",
        "uncleared"
      ],
      "type": "object"
    },
    "bankReported": {
      "additionalProperties": false,
      "properties": {
        "balanceCurrent": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "differenceFromLedger": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        }
      },
      "required": [
        "balanceCurrent",
        "differenceFromLedger"
      ],
      "type": "object"
    },
    "counts": {
      "additionalProperties": false,
      "properties": {
        "cleared": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        },
        "ledger": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        },
        "reconciled": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        },
        "uncleared": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        }
      },
      "required": [
        "ledger",
        "cleared",
        "reconciled",
        "uncleared"
      ],
      "type": "object"
    },
    "cutoff": {
      "type": "string"
    },
    "statement": {
      "anyOf": [
        {
          "additionalProperties": false,
          "properties": {
            "balance": {
              "maximum": 9007199254740991,
              "minimum": -9007199254740991,
              "type": "integer"
            },
            "differenceFromCleared": {
              "maximum": 9007199254740991,
              "minimum": -9007199254740991,
              "type": "integer"
            },
            "differenceFromLedger": {
              "maximum": 9007199254740991,
              "minimum": -9007199254740991,
              "type": "integer"
            },
            "status": {
              "enum": [
                "MATCHES_BOTH",
                "MATCHES_CLEARED",
                "MATCHES_LEDGER",
                "DIFFERENCE"
              ],
              "type": "string"
            }
          },
          "required": [
            "balance",
            "differenceFromLedger",
            "differenceFromCleared",
            "status"
          ],
          "type": "object"
        },
        {
          "type": "null"
        }
      ]
    },
    "status": {
      "enum": [
        "NO_STATEMENT",
        "MATCHES_BOTH",
        "MATCHES_CLEARED",
        "MATCHES_LEDGER",
        "DIFFERENCE"
      ],
      "type": "string"
    }
  },
  "required": [
    "account",
    "cutoff",
    "balances",
    "counts",
    "status",
    "statement"
  ],
  "type": "object"
}
```

</details>

## `actual_get_budget_month`

- Title: Get monthly budget
- Domain: `budget`
- Description: Read official signed month aggregates and runtime-validated envelope or tracking category shapes.
- Capability: `read`
- Mutation-capable: No
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`
- Runtime guards: None
- Synchronization: `none`
- Partial failure: `none`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/read.integration.test.ts` — discovers official budget months and validates month detail, summaries, filters, signs, and mode projection
- Compiled stdio E2E evidence: `test/e2e/read.e2e.test.ts` — reads official budget discovery, month detail, and bounded summaries through compiled stdio

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "One available Actual budget month in strict YYYY-MM form.",
  "properties": {
    "month": {
      "type": "string"
    }
  },
  "required": [
    "month"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Official monthly budget aggregates and nested validated category projections.",
  "properties": {
    "capabilities": {
      "additionalProperties": false,
      "properties": {
        "holdForNextMonth": {
          "type": "boolean"
        },
        "incomeBudgeting": {
          "type": "boolean"
        }
      },
      "required": [
        "holdForNextMonth",
        "incomeBudgeting"
      ],
      "type": "object"
    },
    "categoryGroups": {
      "items": {
        "additionalProperties": false,
        "description": "Runtime-validated budget category group.",
        "properties": {
          "balance": {
            "maximum": 9007199254740991,
            "minimum": -9007199254740991,
            "type": "integer"
          },
          "budgeted": {
            "maximum": 9007199254740991,
            "minimum": -9007199254740991,
            "type": "integer"
          },
          "categories": {
            "items": {
              "additionalProperties": false,
              "description": "Runtime-validated budget category preserving only installed SDK fields and signed values.",
              "properties": {
                "balance": {
                  "maximum": 9007199254740991,
                  "minimum": -9007199254740991,
                  "type": "integer"
                },
                "budgeted": {
                  "maximum": 9007199254740991,
                  "minimum": -9007199254740991,
                  "type": "integer"
                },
                "capabilities": {
                  "additionalProperties": false,
                  "properties": {
                    "budgetAmount": {
                      "description": "Whether the returned month shape exposes a numeric budgeted field for this category.",
                      "type": "boolean"
                    },
                    "carryover": {
                      "description": "Whether the returned expense-category shape exposes a boolean carryover field.",
                      "type": "boolean"
                    }
                  },
                  "required": [
                    "budgetAmount",
                    "carryover"
                  ],
                  "type": "object"
                },
                "carryover": {
                  "type": "boolean"
                },
                "groupId": {
                  "maxLength": 512,
                  "minLength": 1,
                  "type": "string"
                },
                "hidden": {
                  "type": "boolean"
                },
                "id": {
                  "maxLength": 512,
                  "minLength": 1,
                  "type": "string"
                },
                "isIncome": {
                  "type": "boolean"
                },
                "name": {
                  "type": "string"
                },
                "received": {
                  "maximum": 9007199254740991,
                  "minimum": -9007199254740991,
                  "type": "integer"
                },
                "spent": {
                  "maximum": 9007199254740991,
                  "minimum": -9007199254740991,
                  "type": "integer"
                }
              },
              "required": [
                "id",
                "name",
                "groupId",
                "isIncome",
                "hidden",
                "capabilities"
              ],
              "type": "object"
            },
            "type": "array"
          },
          "hidden": {
            "type": "boolean"
          },
          "id": {
            "maxLength": 512,
            "minLength": 1,
            "type": "string"
          },
          "isIncome": {
            "type": "boolean"
          },
          "name": {
            "type": "string"
          },
          "received": {
            "maximum": 9007199254740991,
            "minimum": -9007199254740991,
            "type": "integer"
          },
          "spent": {
            "maximum": 9007199254740991,
            "minimum": -9007199254740991,
            "type": "integer"
          }
        },
        "required": [
          "id",
          "name",
          "isIncome",
          "hidden",
          "categories"
        ],
        "type": "object"
      },
      "type": "array"
    },
    "forNextMonth": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    },
    "fromLastMonth": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    },
    "incomeAvailable": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    },
    "lastMonthOverspent": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    },
    "month": {
      "type": "string"
    },
    "toBudget": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    },
    "totalBalance": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    },
    "totalBudgeted": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    },
    "totalIncome": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    },
    "totalSpent": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    }
  },
  "required": [
    "month",
    "incomeAvailable",
    "lastMonthOverspent",
    "forNextMonth",
    "totalBudgeted",
    "toBudget",
    "fromLastMonth",
    "totalIncome",
    "totalSpent",
    "totalBalance",
    "capabilities",
    "categoryGroups"
  ],
  "type": "object"
}
```

</details>

## `actual_get_budget_summary`

- Title: Summarize monthly budget
- Domain: `budget`
- Description: Return official signed month aggregates with bounded optional category-group and category detail.
- Capability: `read`
- Mutation-capable: No
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`, `MAX_TEXT_LENGTH`, `MAX_DATE_RANGE_DAYS`, `MAX_TOP_PAYEE_RESULTS`, `MAX_BUDGET_CATEGORY_RESULTS`
- Runtime guards: None
- Synchronization: `none`
- Partial failure: `none`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/read.integration.test.ts` — discovers official budget months and validates month detail, summaries, filters, signs, and mode projection
- Compiled stdio E2E evidence: `test/e2e/read.e2e.test.ts` — reads official budget discovery, month detail, and bounded summaries through compiled stdio

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Budget month with optional group/category detail filters and a bounded category limit.",
  "properties": {
    "categoryId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    },
    "groupId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    },
    "limit": {
      "default": 100,
      "maximum": 500,
      "minimum": 1,
      "type": "integer"
    },
    "month": {
      "type": "string"
    }
  },
  "required": [
    "month"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Official monthly aggregates plus bounded optionally filtered category detail.",
  "properties": {
    "categoryCount": {
      "maximum": 9007199254740991,
      "minimum": 0,
      "type": "integer"
    },
    "categoryGroups": {
      "items": {
        "additionalProperties": false,
        "description": "Runtime-validated budget category group.",
        "properties": {
          "balance": {
            "maximum": 9007199254740991,
            "minimum": -9007199254740991,
            "type": "integer"
          },
          "budgeted": {
            "maximum": 9007199254740991,
            "minimum": -9007199254740991,
            "type": "integer"
          },
          "categories": {
            "items": {
              "additionalProperties": false,
              "description": "Runtime-validated budget category preserving only installed SDK fields and signed values.",
              "properties": {
                "balance": {
                  "maximum": 9007199254740991,
                  "minimum": -9007199254740991,
                  "type": "integer"
                },
                "budgeted": {
                  "maximum": 9007199254740991,
                  "minimum": -9007199254740991,
                  "type": "integer"
                },
                "capabilities": {
                  "additionalProperties": false,
                  "properties": {
                    "budgetAmount": {
                      "description": "Whether the returned month shape exposes a numeric budgeted field for this category.",
                      "type": "boolean"
                    },
                    "carryover": {
                      "description": "Whether the returned expense-category shape exposes a boolean carryover field.",
                      "type": "boolean"
                    }
                  },
                  "required": [
                    "budgetAmount",
                    "carryover"
                  ],
                  "type": "object"
                },
                "carryover": {
                  "type": "boolean"
                },
                "groupId": {
                  "maxLength": 512,
                  "minLength": 1,
                  "type": "string"
                },
                "hidden": {
                  "type": "boolean"
                },
                "id": {
                  "maxLength": 512,
                  "minLength": 1,
                  "type": "string"
                },
                "isIncome": {
                  "type": "boolean"
                },
                "name": {
                  "type": "string"
                },
                "received": {
                  "maximum": 9007199254740991,
                  "minimum": -9007199254740991,
                  "type": "integer"
                },
                "spent": {
                  "maximum": 9007199254740991,
                  "minimum": -9007199254740991,
                  "type": "integer"
                }
              },
              "required": [
                "id",
                "name",
                "groupId",
                "isIncome",
                "hidden",
                "capabilities"
              ],
              "type": "object"
            },
            "type": "array"
          },
          "hidden": {
            "type": "boolean"
          },
          "id": {
            "maxLength": 512,
            "minLength": 1,
            "type": "string"
          },
          "isIncome": {
            "type": "boolean"
          },
          "name": {
            "type": "string"
          },
          "received": {
            "maximum": 9007199254740991,
            "minimum": -9007199254740991,
            "type": "integer"
          },
          "spent": {
            "maximum": 9007199254740991,
            "minimum": -9007199254740991,
            "type": "integer"
          }
        },
        "required": [
          "id",
          "name",
          "isIncome",
          "hidden",
          "categories"
        ],
        "type": "object"
      },
      "type": "array"
    },
    "forNextMonth": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    },
    "fromLastMonth": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    },
    "incomeAvailable": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    },
    "lastMonthOverspent": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    },
    "month": {
      "type": "string"
    },
    "omittedCategoryCount": {
      "maximum": 9007199254740991,
      "minimum": 0,
      "type": "integer"
    },
    "toBudget": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    },
    "totalBalance": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    },
    "totalBudgeted": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    },
    "totalIncome": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    },
    "totalSpent": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    }
  },
  "required": [
    "month",
    "incomeAvailable",
    "lastMonthOverspent",
    "forNextMonth",
    "totalBudgeted",
    "toBudget",
    "fromLastMonth",
    "totalIncome",
    "totalSpent",
    "totalBalance",
    "categoryGroups",
    "categoryCount",
    "omittedCategoryCount"
  ],
  "type": "object"
}
```

</details>

## `actual_get_income_summary`

- Title: Get income summary
- Domain: `summaries`
- Description: Return signed income totals, deterministic category breakdowns, and bounded top payees.
- Capability: `read`
- Mutation-capable: No
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`, `MAX_TEXT_LENGTH`, `MAX_DATE_RANGE_DAYS`, `MAX_SUMMARY_SCOPE_IDS`, `MAX_TOP_PAYEE_RESULTS`, `MAX_LEDGER_SCAN_RESULTS`, `LEDGER_QUERY_SENTINEL_LIMIT`
- Runtime guards: None
- Synchronization: `none`
- Partial failure: `none`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/read.integration.test.ts` — validates schedule, summary, and runtime read contracts without mutation
- Compiled stdio E2E evidence: `test/e2e/read.e2e.test.ts` — reads schedules, ledger summaries, and sanitized runtime status through compiled stdio

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Bounded inclusive financial summary range.",
  "properties": {
    "accountIds": {
      "items": {
        "maxLength": 512,
        "minLength": 1,
        "type": "string"
      },
      "maxItems": 250,
      "minItems": 1,
      "type": "array"
    },
    "categoryGroupIds": {
      "items": {
        "maxLength": 512,
        "minLength": 1,
        "type": "string"
      },
      "maxItems": 250,
      "minItems": 1,
      "type": "array"
    },
    "categoryIds": {
      "items": {
        "maxLength": 512,
        "minLength": 1,
        "type": "string"
      },
      "maxItems": 250,
      "minItems": 1,
      "type": "array"
    },
    "endDate": {
      "type": "string"
    },
    "includeOffbudget": {
      "default": false,
      "type": "boolean"
    },
    "startDate": {
      "type": "string"
    },
    "topPayeeLimit": {
      "default": 10,
      "maximum": 50,
      "minimum": 1,
      "type": "integer"
    }
  },
  "required": [
    "startDate",
    "endDate"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Signed income summary with deterministic bounded breakdowns.",
  "properties": {
    "categoryBreakdown": {
      "items": {
        "additionalProperties": false,
        "properties": {
          "amount": {
            "maximum": 9007199254740991,
            "minimum": -9007199254740991,
            "type": "integer"
          },
          "id": {
            "type": "string"
          },
          "name": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ]
          },
          "transactionCount": {
            "maximum": 9007199254740991,
            "minimum": 0,
            "type": "integer"
          }
        },
        "required": [
          "id",
          "name",
          "amount",
          "transactionCount"
        ],
        "type": "object"
      },
      "type": "array"
    },
    "exclusions": {
      "additionalProperties": false,
      "properties": {
        "splitParents": {
          "const": true,
          "type": "boolean"
        },
        "startingBalances": {
          "const": true,
          "type": "boolean"
        },
        "transfers": {
          "const": true,
          "type": "boolean"
        }
      },
      "required": [
        "transfers",
        "startingBalances",
        "splitParents"
      ],
      "type": "object"
    },
    "netIncomeAmount": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    },
    "offbudgetCashFlow": {
      "additionalProperties": false,
      "properties": {
        "inflowAmount": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "netChange": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "outflowAmount": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "transactionCount": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        }
      },
      "required": [
        "inflowAmount",
        "outflowAmount",
        "netChange",
        "transactionCount"
      ],
      "type": "object"
    },
    "scope": {
      "additionalProperties": false,
      "properties": {
        "accountIds": {
          "items": {
            "maxLength": 512,
            "minLength": 1,
            "type": "string"
          },
          "type": "array"
        },
        "endDate": {
          "type": "string"
        },
        "includeOffbudget": {
          "type": "boolean"
        },
        "startDate": {
          "type": "string"
        }
      },
      "required": [
        "startDate",
        "endDate",
        "accountIds",
        "includeOffbudget"
      ],
      "type": "object"
    },
    "source": {
      "const": "fixed-actualql-ledger",
      "type": "string"
    },
    "topPayeeLimit": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    },
    "topPayees": {
      "items": {
        "additionalProperties": false,
        "properties": {
          "amount": {
            "maximum": 9007199254740991,
            "minimum": -9007199254740991,
            "type": "integer"
          },
          "id": {
            "type": "string"
          },
          "name": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ]
          },
          "transactionCount": {
            "maximum": 9007199254740991,
            "minimum": 0,
            "type": "integer"
          }
        },
        "required": [
          "id",
          "name",
          "amount",
          "transactionCount"
        ],
        "type": "object"
      },
      "type": "array"
    },
    "transactionCount": {
      "maximum": 9007199254740991,
      "minimum": 0,
      "type": "integer"
    },
    "uncategorizedIncomeAmount": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    }
  },
  "required": [
    "source",
    "scope",
    "netIncomeAmount",
    "transactionCount",
    "uncategorizedIncomeAmount",
    "categoryBreakdown",
    "topPayees",
    "topPayeeLimit",
    "exclusions"
  ],
  "type": "object"
}
```

</details>

## `actual_get_month_summary`

- Title: Get monthly financial summary
- Domain: `summaries`
- Description: Return signed ledger totals and a separately sourced official budget month when the scope is compatible.
- Capability: `read`
- Mutation-capable: No
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`, `MAX_TEXT_LENGTH`, `MAX_DATE_RANGE_DAYS`, `MAX_SUMMARY_SCOPE_IDS`, `MAX_TOP_PAYEE_RESULTS`, `MAX_LEDGER_SCAN_RESULTS`, `LEDGER_QUERY_SENTINEL_LIMIT`
- Runtime guards: None
- Synchronization: `none`
- Partial failure: `none`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/read.integration.test.ts` — validates schedule, summary, and runtime read contracts without mutation
- Compiled stdio E2E evidence: `test/e2e/read.e2e.test.ts` — reads schedules, ledger summaries, and sanitized runtime status through compiled stdio

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Month and bounded optional financial scope.",
  "properties": {
    "accountIds": {
      "items": {
        "maxLength": 512,
        "minLength": 1,
        "type": "string"
      },
      "maxItems": 250,
      "minItems": 1,
      "type": "array"
    },
    "categoryGroupIds": {
      "items": {
        "maxLength": 512,
        "minLength": 1,
        "type": "string"
      },
      "maxItems": 250,
      "minItems": 1,
      "type": "array"
    },
    "categoryIds": {
      "items": {
        "maxLength": 512,
        "minLength": 1,
        "type": "string"
      },
      "maxItems": 250,
      "minItems": 1,
      "type": "array"
    },
    "includeOffbudget": {
      "default": false,
      "type": "boolean"
    },
    "month": {
      "type": "string"
    },
    "topPayeeLimit": {
      "default": 10,
      "maximum": 50,
      "minimum": 1,
      "type": "integer"
    }
  },
  "required": [
    "month"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Ledger month summary with a separately sourced official budget section when compatible.",
  "properties": {
    "budget": {
      "oneOf": [
        {
          "additionalProperties": false,
          "properties": {
            "available": {
              "const": true,
              "type": "boolean"
            },
            "data": {
              "additionalProperties": false,
              "description": "Official monthly budget aggregates and nested validated category projections.",
              "properties": {
                "capabilities": {
                  "additionalProperties": false,
                  "properties": {
                    "holdForNextMonth": {
                      "type": "boolean"
                    },
                    "incomeBudgeting": {
                      "type": "boolean"
                    }
                  },
                  "required": [
                    "holdForNextMonth",
                    "incomeBudgeting"
                  ],
                  "type": "object"
                },
                "categoryGroups": {
                  "items": {
                    "additionalProperties": false,
                    "description": "Runtime-validated budget category group.",
                    "properties": {
                      "balance": {
                        "maximum": 9007199254740991,
                        "minimum": -9007199254740991,
                        "type": "integer"
                      },
                      "budgeted": {
                        "maximum": 9007199254740991,
                        "minimum": -9007199254740991,
                        "type": "integer"
                      },
                      "categories": {
                        "items": {
                          "additionalProperties": false,
                          "description": "Runtime-validated budget category preserving only installed SDK fields and signed values.",
                          "properties": {
                            "balance": {
                              "maximum": 9007199254740991,
                              "minimum": -9007199254740991,
                              "type": "integer"
                            },
                            "budgeted": {
                              "maximum": 9007199254740991,
                              "minimum": -9007199254740991,
                              "type": "integer"
                            },
                            "capabilities": {
                              "additionalProperties": false,
                              "properties": {
                                "budgetAmount": {
                                  "description": "Whether the returned month shape exposes a numeric budgeted field for this category.",
                                  "type": "boolean"
                                },
                                "carryover": {
                                  "description": "Whether the returned expense-category shape exposes a boolean carryover field.",
                                  "type": "boolean"
                                }
                              },
                              "required": [
                                "budgetAmount",
                                "carryover"
                              ],
                              "type": "object"
                            },
                            "carryover": {
                              "type": "boolean"
                            },
                            "groupId": {
                              "maxLength": 512,
                              "minLength": 1,
                              "type": "string"
                            },
                            "hidden": {
                              "type": "boolean"
                            },
                            "id": {
                              "maxLength": 512,
                              "minLength": 1,
                              "type": "string"
                            },
                            "isIncome": {
                              "type": "boolean"
                            },
                            "name": {
                              "type": "string"
                            },
                            "received": {
                              "maximum": 9007199254740991,
                              "minimum": -9007199254740991,
                              "type": "integer"
                            },
                            "spent": {
                              "maximum": 9007199254740991,
                              "minimum": -9007199254740991,
                              "type": "integer"
                            }
                          },
                          "required": [
                            "id",
                            "name",
                            "groupId",
                            "isIncome",
                            "hidden",
                            "capabilities"
                          ],
                          "type": "object"
                        },
                        "type": "array"
                      },
                      "hidden": {
                        "type": "boolean"
                      },
                      "id": {
                        "maxLength": 512,
                        "minLength": 1,
                        "type": "string"
                      },
                      "isIncome": {
                        "type": "boolean"
                      },
                      "name": {
                        "type": "string"
                      },
                      "received": {
                        "maximum": 9007199254740991,
                        "minimum": -9007199254740991,
                        "type": "integer"
                      },
                      "spent": {
                        "maximum": 9007199254740991,
                        "minimum": -9007199254740991,
                        "type": "integer"
                      }
                    },
                    "required": [
                      "id",
                      "name",
                      "isIncome",
                      "hidden",
                      "categories"
                    ],
                    "type": "object"
                  },
                  "type": "array"
                },
                "forNextMonth": {
                  "maximum": 9007199254740991,
                  "minimum": -9007199254740991,
                  "type": "integer"
                },
                "fromLastMonth": {
                  "maximum": 9007199254740991,
                  "minimum": -9007199254740991,
                  "type": "integer"
                },
                "incomeAvailable": {
                  "maximum": 9007199254740991,
                  "minimum": -9007199254740991,
                  "type": "integer"
                },
                "lastMonthOverspent": {
                  "maximum": 9007199254740991,
                  "minimum": -9007199254740991,
                  "type": "integer"
                },
                "month": {
                  "type": "string"
                },
                "toBudget": {
                  "maximum": 9007199254740991,
                  "minimum": -9007199254740991,
                  "type": "integer"
                },
                "totalBalance": {
                  "maximum": 9007199254740991,
                  "minimum": -9007199254740991,
                  "type": "integer"
                },
                "totalBudgeted": {
                  "maximum": 9007199254740991,
                  "minimum": -9007199254740991,
                  "type": "integer"
                },
                "totalIncome": {
                  "maximum": 9007199254740991,
                  "minimum": -9007199254740991,
                  "type": "integer"
                },
                "totalSpent": {
                  "maximum": 9007199254740991,
                  "minimum": -9007199254740991,
                  "type": "integer"
                }
              },
              "required": [
                "month",
                "incomeAvailable",
                "lastMonthOverspent",
                "forNextMonth",
                "totalBudgeted",
                "toBudget",
                "fromLastMonth",
                "totalIncome",
                "totalSpent",
                "totalBalance",
                "capabilities",
                "categoryGroups"
              ],
              "type": "object"
            },
            "source": {
              "const": "official-getBudgetMonth",
              "type": "string"
            }
          },
          "required": [
            "available",
            "source",
            "data"
          ],
          "type": "object"
        },
        {
          "additionalProperties": false,
          "properties": {
            "available": {
              "const": false,
              "type": "boolean"
            },
            "reason": {
              "type": "string"
            }
          },
          "required": [
            "available",
            "reason"
          ],
          "type": "object"
        }
      ]
    },
    "ledger": {
      "additionalProperties": false,
      "properties": {
        "categorizedCount": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        },
        "exclusions": {
          "additionalProperties": false,
          "properties": {
            "splitParents": {
              "const": true,
              "type": "boolean"
            },
            "startingBalances": {
              "const": true,
              "type": "boolean"
            },
            "transfers": {
              "const": true,
              "type": "boolean"
            }
          },
          "required": [
            "transfers",
            "startingBalances",
            "splitParents"
          ],
          "type": "object"
        },
        "expenseAmount": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "expenseCategoryBreakdown": {
          "items": {
            "additionalProperties": false,
            "properties": {
              "amount": {
                "maximum": 9007199254740991,
                "minimum": -9007199254740991,
                "type": "integer"
              },
              "id": {
                "type": "string"
              },
              "name": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ]
              },
              "transactionCount": {
                "maximum": 9007199254740991,
                "minimum": 0,
                "type": "integer"
              }
            },
            "required": [
              "id",
              "name",
              "amount",
              "transactionCount"
            ],
            "type": "object"
          },
          "type": "array"
        },
        "expenseGroupBreakdown": {
          "items": {
            "additionalProperties": false,
            "properties": {
              "amount": {
                "maximum": 9007199254740991,
                "minimum": -9007199254740991,
                "type": "integer"
              },
              "id": {
                "type": "string"
              },
              "name": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ]
              },
              "transactionCount": {
                "maximum": 9007199254740991,
                "minimum": 0,
                "type": "integer"
              }
            },
            "required": [
              "id",
              "name",
              "amount",
              "transactionCount"
            ],
            "type": "object"
          },
          "type": "array"
        },
        "expenseTransactionCount": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        },
        "incomeAmount": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "incomeCategoryBreakdown": {
          "items": {
            "additionalProperties": false,
            "properties": {
              "amount": {
                "maximum": 9007199254740991,
                "minimum": -9007199254740991,
                "type": "integer"
              },
              "id": {
                "type": "string"
              },
              "name": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ]
              },
              "transactionCount": {
                "maximum": 9007199254740991,
                "minimum": 0,
                "type": "integer"
              }
            },
            "required": [
              "id",
              "name",
              "amount",
              "transactionCount"
            ],
            "type": "object"
          },
          "type": "array"
        },
        "incomeTransactionCount": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        },
        "netAmount": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "offbudgetCashFlow": {
          "additionalProperties": false,
          "properties": {
            "inflowAmount": {
              "maximum": 9007199254740991,
              "minimum": -9007199254740991,
              "type": "integer"
            },
            "netChange": {
              "maximum": 9007199254740991,
              "minimum": -9007199254740991,
              "type": "integer"
            },
            "outflowAmount": {
              "maximum": 9007199254740991,
              "minimum": -9007199254740991,
              "type": "integer"
            },
            "transactionCount": {
              "maximum": 9007199254740991,
              "minimum": 0,
              "type": "integer"
            }
          },
          "required": [
            "inflowAmount",
            "outflowAmount",
            "netChange",
            "transactionCount"
          ],
          "type": "object"
        },
        "scope": {
          "additionalProperties": false,
          "properties": {
            "accountIds": {
              "items": {
                "maxLength": 512,
                "minLength": 1,
                "type": "string"
              },
              "type": "array"
            },
            "endDate": {
              "type": "string"
            },
            "includeOffbudget": {
              "type": "boolean"
            },
            "startDate": {
              "type": "string"
            }
          },
          "required": [
            "startDate",
            "endDate",
            "accountIds",
            "includeOffbudget"
          ],
          "type": "object"
        },
        "source": {
          "const": "fixed-actualql-ledger",
          "type": "string"
        },
        "topExpensePayees": {
          "items": {
            "additionalProperties": false,
            "properties": {
              "amount": {
                "maximum": 9007199254740991,
                "minimum": -9007199254740991,
                "type": "integer"
              },
              "id": {
                "type": "string"
              },
              "name": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ]
              },
              "transactionCount": {
                "maximum": 9007199254740991,
                "minimum": 0,
                "type": "integer"
              }
            },
            "required": [
              "id",
              "name",
              "amount",
              "transactionCount"
            ],
            "type": "object"
          },
          "type": "array"
        },
        "topIncomePayees": {
          "items": {
            "additionalProperties": false,
            "properties": {
              "amount": {
                "maximum": 9007199254740991,
                "minimum": -9007199254740991,
                "type": "integer"
              },
              "id": {
                "type": "string"
              },
              "name": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ]
              },
              "transactionCount": {
                "maximum": 9007199254740991,
                "minimum": 0,
                "type": "integer"
              }
            },
            "required": [
              "id",
              "name",
              "amount",
              "transactionCount"
            ],
            "type": "object"
          },
          "type": "array"
        },
        "topPayeeLimit": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "transactionCount": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        },
        "uncategorizedCount": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        },
        "uncategorizedExpenseAmount": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "uncategorizedIncomeAmount": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        }
      },
      "required": [
        "source",
        "scope",
        "incomeAmount",
        "expenseAmount",
        "netAmount",
        "transactionCount",
        "incomeTransactionCount",
        "expenseTransactionCount",
        "categorizedCount",
        "uncategorizedCount",
        "uncategorizedIncomeAmount",
        "uncategorizedExpenseAmount",
        "incomeCategoryBreakdown",
        "expenseCategoryBreakdown",
        "expenseGroupBreakdown",
        "topIncomePayees",
        "topExpensePayees",
        "topPayeeLimit",
        "exclusions"
      ],
      "type": "object"
    },
    "month": {
      "type": "string"
    }
  },
  "required": [
    "month",
    "ledger",
    "budget"
  ],
  "type": "object"
}
```

</details>

## `actual_get_payee`

- Title: Get Actual payee
- Domain: `payees`
- Description: Get one Actual payee and its official transfer-account relationship when present.
- Capability: `read`
- Mutation-capable: No
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`, `MAX_ENTITY_NAME_LENGTH`
- Runtime guards: None
- Synchronization: `none`
- Partial failure: `none`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/read.integration.test.ts` — reads individual ordinary and transfer payees and returns exact absent-ID errors
- Compiled stdio E2E evidence: `test/e2e/read.e2e.test.ts` — calls health, accounts, categories, and payees with matching structured and JSON content

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Opaque identifier of the requested payee.",
  "properties": {
    "payeeId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    }
  },
  "required": [
    "payeeId"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "The requested Actual payee.",
  "properties": {
    "payee": {
      "additionalProperties": false,
      "description": "One Actual payee with transfer context preserved when supplied by the official API.",
      "properties": {
        "id": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "name": {
          "type": "string"
        },
        "transferAccountId": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "id",
        "name"
      ],
      "type": "object"
    }
  },
  "required": [
    "payee"
  ],
  "type": "object"
}
```

</details>

## `actual_get_rule`

- Title: Get Actual rule
- Domain: `rules`
- Description: Get one Actual rule by stable opaque identifier with complete pinned semantics and MCP writability.
- Capability: `read`
- Mutation-capable: No
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`, `MAX_TEXT_LENGTH`
- Runtime guards: None
- Synchronization: `none`
- Partial failure: `none`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/read.integration.test.ts` — validates the complete ranked real rule list and exact absent-ID behavior
- Compiled stdio E2E evidence: `test/e2e/read.e2e.test.ts` — reads individual payees and the complete ranked rule surface through compiled stdio

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Opaque identifier of the requested rule.",
  "properties": {
    "ruleId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    }
  },
  "required": [
    "ruleId"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "The requested Actual rule.",
  "properties": {
    "rule": {
      "additionalProperties": false,
      "description": "Complete normalized rule with MCP writability classification.",
      "properties": {
        "actions": {
          "items": {
            "anyOf": [
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "type": "string"
                  },
                  "op": {
                    "const": "set",
                    "type": "string"
                  },
                  "options": {
                    "anyOf": [
                      {
                        "additionalProperties": false,
                        "properties": {
                          "formula": {
                            "type": "string"
                          },
                          "splitIndex": {
                            "maximum": 9007199254740991,
                            "minimum": -9007199254740991,
                            "type": "integer"
                          },
                          "template": {
                            "type": "string"
                          }
                        },
                        "type": "object"
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "type": {
                    "type": "string"
                  },
                  "value": {}
                },
                "required": [
                  "op",
                  "field",
                  "value"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "type": "null"
                  },
                  "op": {
                    "const": "set-split-amount",
                    "type": "string"
                  },
                  "options": {
                    "anyOf": [
                      {
                        "additionalProperties": false,
                        "properties": {
                          "formula": {
                            "type": "string"
                          },
                          "method": {
                            "enum": [
                              "fixed-amount",
                              "fixed-percent",
                              "formula",
                              "remainder"
                            ],
                            "type": "string"
                          },
                          "splitIndex": {
                            "maximum": 9007199254740991,
                            "minimum": -9007199254740991,
                            "type": "integer"
                          }
                        },
                        "required": [
                          "method"
                        ],
                        "type": "object"
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "type": {
                    "type": "string"
                  },
                  "value": {
                    "anyOf": [
                      {
                        "maximum": 9007199254740991,
                        "minimum": -9007199254740991,
                        "type": "integer"
                      },
                      {
                        "type": "null"
                      }
                    ]
                  }
                },
                "required": [
                  "op",
                  "value"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "type": "null"
                  },
                  "op": {
                    "const": "link-schedule",
                    "type": "string"
                  },
                  "type": {
                    "type": "string"
                  },
                  "value": {
                    "maxLength": 512,
                    "minLength": 1,
                    "type": "string"
                  }
                },
                "required": [
                  "op",
                  "value"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "notes",
                    "type": "string"
                  },
                  "op": {
                    "const": "prepend-notes",
                    "type": "string"
                  },
                  "type": {
                    "type": "string"
                  },
                  "value": {
                    "type": "string"
                  }
                },
                "required": [
                  "op",
                  "value"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "notes",
                    "type": "string"
                  },
                  "op": {
                    "const": "append-notes",
                    "type": "string"
                  },
                  "type": {
                    "type": "string"
                  },
                  "value": {
                    "type": "string"
                  }
                },
                "required": [
                  "op",
                  "value"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "type": "null"
                  },
                  "op": {
                    "const": "delete-transaction",
                    "type": "string"
                  },
                  "type": {
                    "type": "string"
                  },
                  "value": {
                    "type": "string"
                  }
                },
                "required": [
                  "op",
                  "value"
                ],
                "type": "object"
              }
            ]
          },
          "type": "array"
        },
        "conditions": {
          "items": {
            "additionalProperties": false,
            "properties": {
              "conditionsOp": {
                "enum": [
                  "and",
                  "or"
                ],
                "type": "string"
              },
              "customName": {
                "type": "string"
              },
              "field": {
                "enum": [
                  "account",
                  "category",
                  "category_group",
                  "amount",
                  "date",
                  "notes",
                  "payee",
                  "imported_payee",
                  "saved",
                  "cleared",
                  "reconciled",
                  "transfer"
                ],
                "type": "string"
              },
              "op": {
                "enum": [
                  "is",
                  "isNot",
                  "oneOf",
                  "notOneOf",
                  "contains",
                  "doesNotContain",
                  "matches",
                  "onBudget",
                  "offBudget",
                  "isapprox",
                  "isbetween",
                  "gt",
                  "gte",
                  "lt",
                  "lte",
                  "hasTags",
                  "hasAnyTag"
                ],
                "type": "string"
              },
              "options": {
                "anyOf": [
                  {
                    "additionalProperties": false,
                    "properties": {
                      "inflow": {
                        "type": "boolean"
                      },
                      "month": {
                        "type": "boolean"
                      },
                      "outflow": {
                        "type": "boolean"
                      },
                      "year": {
                        "type": "boolean"
                      }
                    },
                    "type": "object"
                  },
                  {
                    "type": "null"
                  }
                ]
              },
              "queryFilter": {
                "additionalProperties": {
                  "additionalProperties": false,
                  "properties": {
                    "$oneof": {
                      "items": {
                        "type": "string"
                      },
                      "type": "array"
                    }
                  },
                  "required": [
                    "$oneof"
                  ],
                  "type": "object"
                },
                "propertyNames": {
                  "type": "string"
                },
                "type": "object"
              },
              "type": {
                "enum": [
                  "id",
                  "boolean",
                  "date",
                  "number",
                  "string"
                ],
                "type": "string"
              },
              "value": {}
            },
            "required": [
              "field",
              "op",
              "value"
            ],
            "type": "object"
          },
          "type": "array"
        },
        "conditionsOp": {
          "enum": [
            "and",
            "or"
          ],
          "type": "string"
        },
        "id": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "stage": {
          "enum": [
            "pre",
            "default",
            "post"
          ],
          "type": "string"
        },
        "writable": {
          "type": "boolean"
        },
        "writeRestriction": {
          "type": "string"
        }
      },
      "required": [
        "id",
        "stage",
        "conditionsOp",
        "conditions",
        "actions",
        "writable"
      ],
      "type": "object"
    }
  },
  "required": [
    "rule"
  ],
  "type": "object"
}
```

</details>

## `actual_get_runtime_status`

- Title: Get MCP runtime status
- Domain: `runtime`
- Description: Return sanitized process-lifetime connectivity, policy, cache, queue, version, and observed-sync status.
- Capability: `read`
- Mutation-capable: No
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: None
- Runtime guards: None
- Synchronization: `none`
- Partial failure: `none`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/read.integration.test.ts` — validates schedule, summary, and runtime read contracts without mutation
- Compiled stdio E2E evidence: `test/e2e/read.e2e.test.ts` — reads schedules, ledger summaries, and sanitized runtime status through compiled stdio

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "No input is required.",
  "properties": {},
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Sanitized process-lifetime runtime status.",
  "properties": {
    "budgetLoaded": {
      "type": "boolean"
    },
    "cache": {
      "additionalProperties": false,
      "properties": {
        "configured": {
          "type": "boolean"
        },
        "locked": {
          "type": "boolean"
        }
      },
      "required": [
        "configured",
        "locked"
      ],
      "type": "object"
    },
    "connected": {
      "type": "boolean"
    },
    "diagnosticCode": {
      "type": "string"
    },
    "mcpVersion": {
      "type": "string"
    },
    "modes": {
      "additionalProperties": false,
      "properties": {
        "allowDestructive": {
          "type": "boolean"
        },
        "effectiveWriteAllowed": {
          "type": "boolean"
        },
        "readOnly": {
          "type": "boolean"
        }
      },
      "required": [
        "readOnly",
        "allowDestructive",
        "effectiveWriteAllowed"
      ],
      "type": "object"
    },
    "queue": {
      "additionalProperties": false,
      "properties": {
        "activeOperation": {
          "type": "string"
        },
        "queuedCount": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        }
      },
      "required": [
        "queuedCount"
      ],
      "type": "object"
    },
    "sdkVersion": {
      "type": "string"
    },
    "server": {
      "type": "string"
    },
    "syncTelemetry": {
      "additionalProperties": false,
      "properties": {
        "lastSuccessfulSyncAt": {
          "format": "date-time",
          "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          "type": "string"
        },
        "lastSyncAttemptAt": {
          "format": "date-time",
          "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          "type": "string"
        },
        "lastSyncDurationMs": {
          "minimum": 0,
          "type": "number"
        },
        "lastSyncErrorCode": {
          "type": "string"
        }
      },
      "type": "object"
    },
    "telemetryScope": {
      "const": "mcp-initiated-syncs-only",
      "type": "string"
    },
    "unavailableMetadata": {
      "prefixItems": [
        {
          "const": "initialFullSync",
          "type": "string"
        },
        {
          "const": "sdkInternalScheduleServiceRuns",
          "type": "string"
        }
      ],
      "type": "array"
    },
    "uptimeMs": {
      "minimum": 0,
      "type": "number"
    }
  },
  "required": [
    "mcpVersion",
    "sdkVersion",
    "connected",
    "budgetLoaded",
    "server",
    "uptimeMs",
    "modes",
    "cache",
    "queue",
    "syncTelemetry",
    "telemetryScope",
    "unavailableMetadata"
  ],
  "type": "object"
}
```

</details>

## `actual_get_schedule`

- Title: Get Actual schedule
- Domain: `schedules`
- Description: Get one exact stable schedule projection through the complete public schedule list.
- Capability: `read`
- Mutation-capable: No
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`, `MAX_ENTITY_NAME_LENGTH`, `MAX_TEXT_LENGTH`
- Runtime guards: None
- Synchronization: `none`
- Partial failure: `none`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/read.integration.test.ts` — validates schedule, summary, and runtime read contracts without mutation
- Compiled stdio E2E evidence: `test/e2e/read.e2e.test.ts` — reads schedules, ledger summaries, and sanitized runtime status through compiled stdio

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Exact schedule identifier.",
  "properties": {
    "scheduleId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    }
  },
  "required": [
    "scheduleId"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Exact projected schedule.",
  "properties": {
    "schedule": {
      "additionalProperties": false,
      "description": "Stable schedule projection without protected rule internals.",
      "properties": {
        "accountId": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "amount": {
          "anyOf": [
            {
              "oneOf": [
                {
                  "additionalProperties": false,
                  "properties": {
                    "amount": {
                      "maximum": 9007199254740991,
                      "minimum": -9007199254740991,
                      "type": "integer"
                    },
                    "type": {
                      "const": "exact",
                      "type": "string"
                    }
                  },
                  "required": [
                    "type",
                    "amount"
                  ],
                  "type": "object"
                },
                {
                  "additionalProperties": false,
                  "properties": {
                    "amount": {
                      "maximum": 9007199254740991,
                      "minimum": -9007199254740991,
                      "type": "integer"
                    },
                    "type": {
                      "const": "approximate",
                      "type": "string"
                    }
                  },
                  "required": [
                    "type",
                    "amount"
                  ],
                  "type": "object"
                },
                {
                  "additionalProperties": false,
                  "properties": {
                    "maxAmount": {
                      "maximum": 9007199254740991,
                      "minimum": -9007199254740991,
                      "type": "integer"
                    },
                    "minAmount": {
                      "maximum": 9007199254740991,
                      "minimum": -9007199254740991,
                      "type": "integer"
                    },
                    "type": {
                      "const": "between",
                      "type": "string"
                    }
                  },
                  "required": [
                    "type",
                    "minAmount",
                    "maxAmount"
                  ],
                  "type": "object"
                }
              ]
            },
            {
              "type": "null"
            }
          ]
        },
        "completed": {
          "type": "boolean"
        },
        "date": {
          "anyOf": [
            {
              "oneOf": [
                {
                  "additionalProperties": false,
                  "properties": {
                    "date": {
                      "type": "string"
                    },
                    "type": {
                      "const": "oneTime",
                      "type": "string"
                    }
                  },
                  "required": [
                    "type",
                    "date"
                  ],
                  "type": "object"
                },
                {
                  "additionalProperties": false,
                  "properties": {
                    "end": {
                      "default": {
                        "type": "never"
                      },
                      "oneOf": [
                        {
                          "additionalProperties": false,
                          "properties": {
                            "type": {
                              "const": "never",
                              "type": "string"
                            }
                          },
                          "required": [
                            "type"
                          ],
                          "type": "object"
                        },
                        {
                          "additionalProperties": false,
                          "properties": {
                            "occurrences": {
                              "exclusiveMinimum": 0,
                              "maximum": 9007199254740991,
                              "type": "integer"
                            },
                            "type": {
                              "const": "afterOccurrences",
                              "type": "string"
                            }
                          },
                          "required": [
                            "type",
                            "occurrences"
                          ],
                          "type": "object"
                        },
                        {
                          "additionalProperties": false,
                          "properties": {
                            "date": {
                              "type": "string"
                            },
                            "type": {
                              "const": "onDate",
                              "type": "string"
                            }
                          },
                          "required": [
                            "type",
                            "date"
                          ],
                          "type": "object"
                        }
                      ]
                    },
                    "frequency": {
                      "enum": [
                        "daily",
                        "weekly",
                        "monthly",
                        "yearly"
                      ],
                      "type": "string"
                    },
                    "interval": {
                      "exclusiveMinimum": 0,
                      "maximum": 9007199254740991,
                      "type": "integer"
                    },
                    "patterns": {
                      "items": {
                        "additionalProperties": false,
                        "properties": {
                          "type": {
                            "enum": [
                              "day",
                              "SU",
                              "MO",
                              "TU",
                              "WE",
                              "TH",
                              "FR",
                              "SA"
                            ],
                            "type": "string"
                          },
                          "value": {
                            "maximum": 9007199254740991,
                            "minimum": -9007199254740991,
                            "type": "integer"
                          }
                        },
                        "required": [
                          "type",
                          "value"
                        ],
                        "type": "object"
                      },
                      "minItems": 1,
                      "type": "array"
                    },
                    "start": {
                      "type": "string"
                    },
                    "type": {
                      "const": "recurring",
                      "type": "string"
                    },
                    "weekend": {
                      "default": "none",
                      "enum": [
                        "none",
                        "before",
                        "after"
                      ],
                      "type": "string"
                    }
                  },
                  "required": [
                    "type",
                    "frequency",
                    "start",
                    "interval",
                    "weekend",
                    "end"
                  ],
                  "type": "object"
                }
              ]
            },
            {
              "type": "null"
            }
          ]
        },
        "id": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "name": {
          "type": "string"
        },
        "nextDate": {
          "type": "string"
        },
        "payeeId": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "postsTransaction": {
          "type": "boolean"
        },
        "unsupportedReasons": {
          "items": {
            "type": "string"
          },
          "type": "array"
        },
        "writable": {
          "type": "boolean"
        }
      },
      "required": [
        "id",
        "accountId",
        "payeeId",
        "amount",
        "date",
        "completed",
        "postsTransaction",
        "writable",
        "unsupportedReasons"
      ],
      "type": "object"
    }
  },
  "required": [
    "schedule"
  ],
  "type": "object"
}
```

</details>

## `actual_get_spending_summary`

- Title: Get spending summary
- Domain: `summaries`
- Description: Return signed expense totals, deterministic category/group breakdowns, and bounded top payees.
- Capability: `read`
- Mutation-capable: No
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`, `MAX_TEXT_LENGTH`, `MAX_DATE_RANGE_DAYS`, `MAX_SUMMARY_SCOPE_IDS`, `MAX_TOP_PAYEE_RESULTS`, `MAX_LEDGER_SCAN_RESULTS`, `LEDGER_QUERY_SENTINEL_LIMIT`
- Runtime guards: None
- Synchronization: `none`
- Partial failure: `none`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/read.integration.test.ts` — validates schedule, summary, and runtime read contracts without mutation
- Compiled stdio E2E evidence: `test/e2e/read.e2e.test.ts` — reads schedules, ledger summaries, and sanitized runtime status through compiled stdio

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Bounded inclusive financial summary range.",
  "properties": {
    "accountIds": {
      "items": {
        "maxLength": 512,
        "minLength": 1,
        "type": "string"
      },
      "maxItems": 250,
      "minItems": 1,
      "type": "array"
    },
    "categoryGroupIds": {
      "items": {
        "maxLength": 512,
        "minLength": 1,
        "type": "string"
      },
      "maxItems": 250,
      "minItems": 1,
      "type": "array"
    },
    "categoryIds": {
      "items": {
        "maxLength": 512,
        "minLength": 1,
        "type": "string"
      },
      "maxItems": 250,
      "minItems": 1,
      "type": "array"
    },
    "endDate": {
      "type": "string"
    },
    "includeOffbudget": {
      "default": false,
      "type": "boolean"
    },
    "startDate": {
      "type": "string"
    },
    "topPayeeLimit": {
      "default": 10,
      "maximum": 50,
      "minimum": 1,
      "type": "integer"
    }
  },
  "required": [
    "startDate",
    "endDate"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Signed spending summary with deterministic bounded breakdowns.",
  "properties": {
    "categoryBreakdown": {
      "items": {
        "additionalProperties": false,
        "properties": {
          "amount": {
            "maximum": 9007199254740991,
            "minimum": -9007199254740991,
            "type": "integer"
          },
          "id": {
            "type": "string"
          },
          "name": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ]
          },
          "transactionCount": {
            "maximum": 9007199254740991,
            "minimum": 0,
            "type": "integer"
          }
        },
        "required": [
          "id",
          "name",
          "amount",
          "transactionCount"
        ],
        "type": "object"
      },
      "type": "array"
    },
    "exclusions": {
      "additionalProperties": false,
      "properties": {
        "splitParents": {
          "const": true,
          "type": "boolean"
        },
        "startingBalances": {
          "const": true,
          "type": "boolean"
        },
        "transfers": {
          "const": true,
          "type": "boolean"
        }
      },
      "required": [
        "transfers",
        "startingBalances",
        "splitParents"
      ],
      "type": "object"
    },
    "groupBreakdown": {
      "items": {
        "additionalProperties": false,
        "properties": {
          "amount": {
            "maximum": 9007199254740991,
            "minimum": -9007199254740991,
            "type": "integer"
          },
          "id": {
            "type": "string"
          },
          "name": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ]
          },
          "transactionCount": {
            "maximum": 9007199254740991,
            "minimum": 0,
            "type": "integer"
          }
        },
        "required": [
          "id",
          "name",
          "amount",
          "transactionCount"
        ],
        "type": "object"
      },
      "type": "array"
    },
    "netExpenseAmount": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    },
    "offbudgetCashFlow": {
      "additionalProperties": false,
      "properties": {
        "inflowAmount": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "netChange": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "outflowAmount": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "transactionCount": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        }
      },
      "required": [
        "inflowAmount",
        "outflowAmount",
        "netChange",
        "transactionCount"
      ],
      "type": "object"
    },
    "scope": {
      "additionalProperties": false,
      "properties": {
        "accountIds": {
          "items": {
            "maxLength": 512,
            "minLength": 1,
            "type": "string"
          },
          "type": "array"
        },
        "endDate": {
          "type": "string"
        },
        "includeOffbudget": {
          "type": "boolean"
        },
        "startDate": {
          "type": "string"
        }
      },
      "required": [
        "startDate",
        "endDate",
        "accountIds",
        "includeOffbudget"
      ],
      "type": "object"
    },
    "source": {
      "const": "fixed-actualql-ledger",
      "type": "string"
    },
    "topPayeeLimit": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    },
    "topPayees": {
      "items": {
        "additionalProperties": false,
        "properties": {
          "amount": {
            "maximum": 9007199254740991,
            "minimum": -9007199254740991,
            "type": "integer"
          },
          "id": {
            "type": "string"
          },
          "name": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ]
          },
          "transactionCount": {
            "maximum": 9007199254740991,
            "minimum": 0,
            "type": "integer"
          }
        },
        "required": [
          "id",
          "name",
          "amount",
          "transactionCount"
        ],
        "type": "object"
      },
      "type": "array"
    },
    "transactionCount": {
      "maximum": 9007199254740991,
      "minimum": 0,
      "type": "integer"
    },
    "uncategorizedExpenseAmount": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    }
  },
  "required": [
    "source",
    "scope",
    "netExpenseAmount",
    "transactionCount",
    "uncategorizedExpenseAmount",
    "categoryBreakdown",
    "groupBreakdown",
    "topPayees",
    "topPayeeLimit",
    "exclusions"
  ],
  "type": "object"
}
```

</details>

## `actual_get_transaction`

- Title: Get exact Actual transaction
- Domain: `transactions`
- Description: Get one exact transaction by opaque ID, preserving transfer, starting-balance, and split identity.
- Capability: `read`
- Mutation-capable: No
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`, `MAX_TEXT_LENGTH`, `LINKED_TRANSACTION_LOOKUP_LIMIT`
- Runtime guards: None
- Synchronization: `none`
- Partial failure: `none`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/read.integration.test.ts` — performs exact lookup and typed cross-account search through the installed query path
- Compiled stdio E2E evidence: `test/e2e/read.e2e.test.ts` — executes exact lookup and advanced search filters, ordering, pagination, totals, and split modes through compiled stdio

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Exact opaque transaction identifier.",
  "properties": {
    "transactionId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    }
  },
  "required": [
    "transactionId"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$defs": {
    "__schema0": {
      "additionalProperties": false,
      "description": "Normalized Actual transaction. Explicit null values from Actual are preserved; absent optional fields remain absent.",
      "properties": {
        "account": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "amount": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "category": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "category_name": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "cleared": {
          "type": "boolean"
        },
        "date": {
          "type": "string"
        },
        "id": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "imported_id": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "imported_payee": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "is_child": {
          "type": "boolean"
        },
        "is_parent": {
          "type": "boolean"
        },
        "isTransfer": {
          "type": "boolean"
        },
        "notes": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "parent_id": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "payee": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "payee_name": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "reconciled": {
          "type": "boolean"
        },
        "starting_balance_flag": {
          "type": "boolean"
        },
        "subtransactions": {
          "items": {
            "$ref": "#/$defs/__schema0"
          },
          "type": "array"
        },
        "transfer_id": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "id",
        "account",
        "date",
        "amount"
      ],
      "type": "object"
    }
  },
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "The exact requested canonical transaction.",
  "properties": {
    "transaction": {
      "$ref": "#/$defs/__schema0"
    }
  },
  "required": [
    "transaction"
  ],
  "type": "object"
}
```

</details>

## `actual_get_transactions`

- Title: Get Actual transactions
- Domain: `transactions`
- Description: Get transactions for one account over an inclusive period of at most 366 days.
- Capability: `read`
- Mutation-capable: No
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`, `MAX_TEXT_LENGTH`, `MAX_DATE_RANGE_DAYS`, `MAX_LEDGER_SCAN_RESULTS`
- Runtime guards: None
- Synchronization: `none`
- Partial failure: `none`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/read.integration.test.ts` — performs exact lookup and typed cross-account search through the installed query path
- Compiled stdio E2E evidence: `test/e2e/read.e2e.test.ts` — executes exact lookup and advanced search filters, ordering, pagination, totals, and split modes through compiled stdio

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Account and inclusive transaction date range, limited to 366 days.",
  "properties": {
    "accountId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    },
    "endDate": {
      "type": "string"
    },
    "startDate": {
      "type": "string"
    }
  },
  "required": [
    "accountId",
    "startDate",
    "endDate"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$defs": {
    "__schema0": {
      "additionalProperties": false,
      "description": "Normalized Actual transaction. Explicit null values from Actual are preserved; absent optional fields remain absent.",
      "properties": {
        "account": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "amount": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "category": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "category_name": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "cleared": {
          "type": "boolean"
        },
        "date": {
          "type": "string"
        },
        "id": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "imported_id": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "imported_payee": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "is_child": {
          "type": "boolean"
        },
        "is_parent": {
          "type": "boolean"
        },
        "isTransfer": {
          "type": "boolean"
        },
        "notes": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "parent_id": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "payee": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "payee_name": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "reconciled": {
          "type": "boolean"
        },
        "starting_balance_flag": {
          "type": "boolean"
        },
        "subtransactions": {
          "items": {
            "$ref": "#/$defs/__schema0"
          },
          "type": "array"
        },
        "transfer_id": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "id",
        "account",
        "date",
        "amount"
      ],
      "type": "object"
    }
  },
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Transactions returned for the requested bounded date range.",
  "properties": {
    "transactions": {
      "items": {
        "$ref": "#/$defs/__schema0"
      },
      "type": "array"
    }
  },
  "required": [
    "transactions"
  ],
  "type": "object"
}
```

</details>

## `actual_get_transfer`

- Title: Get exact Actual transfer
- Domain: `transfers`
- Description: Inspect one reciprocal transfer pair by either exact transaction ID and return integrity evidence.
- Capability: `read`
- Mutation-capable: No
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`, `MAX_TEXT_LENGTH`, `LINKED_TRANSACTION_LOOKUP_LIMIT`
- Runtime guards: None
- Synchronization: `none`
- Partial failure: `none`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/read.integration.test.ts` — reads transfer payees, transfer search, diagnostics, and reconciliation without mutation
- Compiled stdio E2E evidence: `test/e2e/read.e2e.test.ts` — exercises transfer, diagnostic, and reconciliation reads through compiled stdio

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Exact transaction ID on either transfer side.",
  "properties": {
    "transactionId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    }
  },
  "required": [
    "transactionId"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$defs": {
    "__schema0": {
      "additionalProperties": false,
      "description": "Normalized Actual transaction. Explicit null values from Actual are preserved; absent optional fields remain absent.",
      "properties": {
        "account": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "amount": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "category": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "category_name": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "cleared": {
          "type": "boolean"
        },
        "date": {
          "type": "string"
        },
        "id": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "imported_id": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "imported_payee": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "is_child": {
          "type": "boolean"
        },
        "is_parent": {
          "type": "boolean"
        },
        "isTransfer": {
          "type": "boolean"
        },
        "notes": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "parent_id": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "payee": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "payee_name": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "reconciled": {
          "type": "boolean"
        },
        "starting_balance_flag": {
          "type": "boolean"
        },
        "subtransactions": {
          "items": {
            "$ref": "#/$defs/__schema0"
          },
          "type": "array"
        },
        "transfer_id": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "id",
        "account",
        "date",
        "amount"
      ],
      "type": "object"
    }
  },
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Canonical observed reciprocal transfer pair and deterministic integrity evidence.",
  "properties": {
    "fromTransaction": {
      "anyOf": [
        {
          "$ref": "#/$defs/__schema0"
        },
        {
          "type": "null"
        }
      ]
    },
    "integrity": {
      "enum": [
        "VALID",
        "INVALID"
      ],
      "type": "string"
    },
    "magnitude": {
      "anyOf": [
        {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        {
          "type": "null"
        }
      ]
    },
    "pairKey": {
      "pattern": "^v1:[a-f0-9]{64}$",
      "type": "string"
    },
    "reasonCodes": {
      "items": {
        "enum": [
          "MISSING_COUNTERPART",
          "NON_RECIPROCAL_RELATIONSHIP",
          "SAME_ACCOUNT",
          "ZERO_AMOUNT",
          "SAME_SIGN",
          "MAGNITUDE_MISMATCH",
          "MALFORMED_RELATIONSHIP_ID"
        ],
        "type": "string"
      },
      "type": "array"
    },
    "toTransaction": {
      "anyOf": [
        {
          "$ref": "#/$defs/__schema0"
        },
        {
          "type": "null"
        }
      ]
    },
    "transactionA": {
      "anyOf": [
        {
          "$ref": "#/$defs/__schema0"
        },
        {
          "type": "null"
        }
      ]
    },
    "transactionB": {
      "anyOf": [
        {
          "$ref": "#/$defs/__schema0"
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "required": [
    "pairKey",
    "transactionA",
    "transactionB",
    "integrity",
    "reasonCodes",
    "fromTransaction",
    "toTransaction",
    "magnitude"
  ],
  "type": "object"
}
```

</details>

## `actual_health`

- Title: Check Actual health
- Domain: `runtime`
- Description: Check Actual Server connectivity and local budget state without exposing credentials.
- Capability: `read`
- Mutation-capable: No
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: None
- Runtime guards: None
- Synchronization: `none`
- Partial failure: `none`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/read.integration.test.ts` — passes health preflight through the production contract
- Compiled stdio E2E evidence: `test/e2e/read.e2e.test.ts` — calls health, accounts, categories, and payees with matching structured and JSON content

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "No input is required.",
  "properties": {},
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Sanitized Actual connectivity and local budget status.",
  "properties": {
    "budgetLoaded": {
      "type": "boolean"
    },
    "connected": {
      "type": "boolean"
    },
    "diagnosticCode": {
      "type": "string"
    },
    "mcpVersion": {
      "type": "string"
    },
    "readOnlyMode": {
      "type": "boolean"
    },
    "sdkVersion": {
      "type": "string"
    },
    "server": {
      "type": "string"
    },
    "version": {
      "type": "string"
    }
  },
  "required": [
    "connected",
    "server",
    "budgetLoaded"
  ],
  "type": "object"
}
```

</details>

## `actual_hide_category`

- Title: Hide Actual category
- Domain: `categories`
- Description: Set an Actual category to hidden and verify the persisted desired state.
- Capability: `write`
- Mutation-capable: Yes
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`, `MAX_ENTITY_NAME_LENGTH`
- Runtime guards: `ACTUAL_MCP_READ_ONLY`
- Synchronization: `write-and-sync`
- Partial failure: `sync-after-write`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/write.integration.test.ts` — administers isolated account and category structure with exact-ID cleanup and complete safety preflights
- Compiled stdio E2E evidence: `test/e2e/write.e2e.test.ts` — exercises the complete structural lifecycle through real MCP stdio

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Opaque identifier of the requested category.",
  "properties": {
    "categoryId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    }
  },
  "required": [
    "categoryId"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Persisted category state after a structural operation.",
  "properties": {
    "category": {
      "additionalProperties": false,
      "description": "Normalized category administration entity.",
      "properties": {
        "groupId": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "hidden": {
          "type": "boolean"
        },
        "id": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "isIncome": {
          "type": "boolean"
        },
        "name": {
          "type": "string"
        }
      },
      "required": [
        "id",
        "name",
        "groupId",
        "isIncome",
        "hidden"
      ],
      "type": "object"
    },
    "changed": {
      "description": "Whether this call changed persisted Actual state.",
      "type": "boolean"
    },
    "success": {
      "const": true,
      "type": "boolean"
    }
  },
  "required": [
    "success",
    "changed",
    "category"
  ],
  "type": "object"
}
```

</details>

## `actual_hold_budget_for_next_month`

- Title: Hold budget funds for next month
- Domain: `budget`
- Description: Incrementally hold a positive amount in an envelope budget and report the official applied result and observed aggregate.
- Capability: `write`
- Mutation-capable: Yes
- Destructive: No
- Idempotent: No
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`
- Runtime guards: `ACTUAL_MCP_READ_ONLY`
- Synchronization: `write-and-sync`
- Partial failure: `sync-after-write`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/write.integration.test.ts` — uses dynamically selected clean months for verified budget amount, carryover, hold/reset, and copy writes
- Compiled stdio E2E evidence: `test/e2e/write.e2e.test.ts` — executes guarded budget writes and copy through compiled MCP stdio with exact cleanup

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Positive incremental amount to hold for the next month in an envelope budget.",
  "properties": {
    "amount": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    },
    "month": {
      "type": "string"
    }
  },
  "required": [
    "month",
    "amount"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Observed envelope hold result without claiming that the aggregate is exclusively manual hold.",
  "properties": {
    "changed": {
      "description": "Whether this call changed persisted Actual state.",
      "type": "boolean"
    },
    "currentForNextMonth": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    },
    "month": {
      "type": "string"
    },
    "officialApplied": {
      "type": "boolean"
    },
    "previousForNextMonth": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    },
    "requestedAmount": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    },
    "success": {
      "const": true,
      "type": "boolean"
    }
  },
  "required": [
    "success",
    "changed",
    "month",
    "requestedAmount",
    "officialApplied",
    "previousForNextMonth",
    "currentForNextMonth"
  ],
  "type": "object"
}
```

</details>

## `actual_import_transactions`

- Title: Import Actual transactions
- Domain: `import`
- Description: Import up to 500 transactions idempotently using required opaque imported_id values.
- Capability: `write`
- Mutation-capable: Yes
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`, `MAX_TEXT_LENGTH`, `MAX_DATE_RANGE_DAYS`, `MAX_IMPORT_BATCH`
- Runtime guards: `ACTUAL_MCP_READ_ONLY`
- Synchronization: `write-and-sync`
- Partial failure: `multi-step`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/write.integration.test.ts` — imports a uniquely owned transaction and validates manual and imported records with one schema
- Compiled stdio E2E evidence: `test/e2e/write.e2e.test.ts` — imports and reads a uniquely owned transaction through MCP stdio

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Target account and one to 500 idempotent import items.",
  "properties": {
    "accountId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    },
    "defaultCleared": {
      "type": "boolean"
    },
    "expectedPreviewFingerprint": {
      "pattern": "^v1:[a-f0-9]{64}$",
      "type": "string"
    },
    "reimportDeleted": {
      "type": "boolean"
    },
    "transactions": {
      "items": {
        "additionalProperties": false,
        "description": "One transaction to reconcile through the official import API.",
        "properties": {
          "amount": {
            "maximum": 9007199254740991,
            "minimum": -9007199254740991,
            "type": "integer"
          },
          "category": {
            "maxLength": 512,
            "minLength": 1,
            "type": "string"
          },
          "cleared": {
            "type": "boolean"
          },
          "date": {
            "type": "string"
          },
          "imported_id": {
            "maxLength": 512,
            "minLength": 1,
            "type": "string"
          },
          "imported_payee": {
            "maxLength": 10000,
            "type": "string"
          },
          "notes": {
            "maxLength": 10000,
            "type": "string"
          },
          "payee": {
            "maxLength": 512,
            "minLength": 1,
            "type": "string"
          },
          "payee_name": {
            "maxLength": 10000,
            "type": "string"
          }
        },
        "required": [
          "date",
          "amount",
          "imported_id"
        ],
        "type": "object"
      },
      "maxItems": 500,
      "minItems": 1,
      "type": "array"
    }
  },
  "required": [
    "accountId",
    "transactions"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Official reconciliation outcome with sanitized item errors.",
  "properties": {
    "added": {
      "items": {
        "maxLength": 512,
        "minLength": 1,
        "type": "string"
      },
      "type": "array"
    },
    "addedCount": {
      "maximum": 9007199254740991,
      "minimum": 0,
      "type": "integer"
    },
    "errorCount": {
      "maximum": 9007199254740991,
      "minimum": 0,
      "type": "integer"
    },
    "errors": {
      "items": {
        "additionalProperties": false,
        "properties": {
          "message": {
            "type": "string"
          }
        },
        "required": [
          "message"
        ],
        "type": "object"
      },
      "type": "array"
    },
    "requestFingerprint": {
      "pattern": "^v1:[a-f0-9]{64}$",
      "type": "string"
    },
    "updated": {
      "items": {
        "maxLength": 512,
        "minLength": 1,
        "type": "string"
      },
      "type": "array"
    },
    "updatedCount": {
      "maximum": 9007199254740991,
      "minimum": 0,
      "type": "integer"
    }
  },
  "required": [
    "added",
    "updated",
    "errors"
  ],
  "type": "object"
}
```

</details>

## `actual_list_accounts`

- Title: List Actual accounts
- Domain: `accounts`
- Description: List every Actual account with its official ledger balance when available.
- Capability: `read`
- Mutation-capable: No
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: None
- Runtime guards: None
- Synchronization: `none`
- Partial failure: `none`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/read.integration.test.ts` — finds both dedicated accounts by name and validates normalized account output
- Compiled stdio E2E evidence: `test/e2e/read.e2e.test.ts` — calls health, accounts, categories, and payees with matching structured and JSON content

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "No input is required.",
  "properties": {},
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "All Actual accounts and available ledger balances.",
  "properties": {
    "accounts": {
      "items": {
        "additionalProperties": false,
        "description": "Normalized Actual account.",
        "properties": {
          "balance": {
            "description": "Ledger balance in integer minor units.",
            "maximum": 9007199254740991,
            "minimum": -9007199254740991,
            "type": "integer"
          },
          "balanceError": {
            "description": "Sanitized balance lookup error, when balance retrieval failed.",
            "type": "string"
          },
          "closed": {
            "description": "Whether the account is closed.",
            "type": "boolean"
          },
          "id": {
            "description": "Opaque Actual account identifier.",
            "maxLength": 512,
            "minLength": 1,
            "type": "string"
          },
          "name": {
            "description": "User-authored account name, returned verbatim.",
            "type": "string"
          },
          "offbudget": {
            "description": "Whether the account is excluded from the budget.",
            "type": "boolean"
          }
        },
        "required": [
          "id",
          "name",
          "offbudget",
          "closed"
        ],
        "type": "object"
      },
      "type": "array"
    }
  },
  "required": [
    "accounts"
  ],
  "type": "object"
}
```

</details>

## `actual_list_budget_months`

- Title: List available budget months
- Domain: `budget`
- Description: List the chronological months available for official budget queries; availability does not imply configured planning.
- Capability: `read`
- Mutation-capable: No
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: None
- Runtime guards: None
- Synchronization: `none`
- Partial failure: `none`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/read.integration.test.ts` — discovers official budget months and validates month detail, summaries, filters, signs, and mode projection
- Compiled stdio E2E evidence: `test/e2e/read.e2e.test.ts` — reads official budget discovery, month detail, and bounded summaries through compiled stdio

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "No input is required.",
  "properties": {},
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Chronological months available through the official budget API and their exact count.",
  "properties": {
    "count": {
      "maximum": 9007199254740991,
      "minimum": 0,
      "type": "integer"
    },
    "months": {
      "items": {
        "type": "string"
      },
      "type": "array"
    }
  },
  "required": [
    "months",
    "count"
  ],
  "type": "object"
}
```

</details>

## `actual_list_categories`

- Title: List Actual categories
- Domain: `categories`
- Description: List Actual category groups while preserving their nested categories.
- Capability: `read`
- Mutation-capable: No
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: None
- Runtime guards: None
- Synchronization: `none`
- Partial failure: `none`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/read.integration.test.ts` — validates real category groups and nested categories
- Compiled stdio E2E evidence: `test/e2e/read.e2e.test.ts` — calls health, accounts, categories, and payees with matching structured and JSON content

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "No input is required.",
  "properties": {},
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Actual category groups with nested categories.",
  "properties": {
    "categoryGroups": {
      "items": {
        "additionalProperties": false,
        "properties": {
          "categories": {
            "items": {
              "additionalProperties": false,
              "properties": {
                "hidden": {
                  "type": "boolean"
                },
                "id": {
                  "maxLength": 512,
                  "minLength": 1,
                  "type": "string"
                },
                "name": {
                  "type": "string"
                }
              },
              "required": [
                "id",
                "name",
                "hidden"
              ],
              "type": "object"
            },
            "type": "array"
          },
          "groupId": {
            "maxLength": 512,
            "minLength": 1,
            "type": "string"
          },
          "groupName": {
            "type": "string"
          }
        },
        "required": [
          "groupId",
          "groupName",
          "categories"
        ],
        "type": "object"
      },
      "type": "array"
    }
  },
  "required": [
    "categoryGroups"
  ],
  "type": "object"
}
```

</details>

## `actual_list_payees`

- Title: List Actual payees
- Domain: `payees`
- Description: List every Actual payee with its opaque identifier and user-authored name.
- Capability: `read`
- Mutation-capable: No
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: `MAX_ENTITY_NAME_LENGTH`
- Runtime guards: None
- Synchronization: `none`
- Partial failure: `none`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/read.integration.test.ts` — reads individual ordinary and transfer payees and returns exact absent-ID errors
- Compiled stdio E2E evidence: `test/e2e/read.e2e.test.ts` — calls health, accounts, categories, and payees with matching structured and JSON content

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "No input is required.",
  "properties": {},
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Every Actual payee and opaque identifier.",
  "properties": {
    "payees": {
      "items": {
        "additionalProperties": false,
        "properties": {
          "id": {
            "maxLength": 512,
            "minLength": 1,
            "type": "string"
          },
          "name": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "name"
        ],
        "type": "object"
      },
      "type": "array"
    }
  },
  "required": [
    "payees"
  ],
  "type": "object"
}
```

</details>

## `actual_list_rules`

- Title: List Actual rules
- Domain: `rules`
- Description: List every Actual rule in official execution order with complete pinned semantics and MCP writability.
- Capability: `read`
- Mutation-capable: No
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: `MAX_TEXT_LENGTH`
- Runtime guards: None
- Synchronization: `none`
- Partial failure: `none`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/read.integration.test.ts` — validates the complete ranked real rule list and exact absent-ID behavior
- Compiled stdio E2E evidence: `test/e2e/read.e2e.test.ts` — reads individual payees and the complete ranked rule surface through compiled stdio

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "No input is required.",
  "properties": {},
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "All Actual rules in official execution order.",
  "properties": {
    "rules": {
      "items": {
        "additionalProperties": false,
        "description": "Complete normalized rule with MCP writability classification.",
        "properties": {
          "actions": {
            "items": {
              "anyOf": [
                {
                  "additionalProperties": false,
                  "properties": {
                    "field": {
                      "type": "string"
                    },
                    "op": {
                      "const": "set",
                      "type": "string"
                    },
                    "options": {
                      "anyOf": [
                        {
                          "additionalProperties": false,
                          "properties": {
                            "formula": {
                              "type": "string"
                            },
                            "splitIndex": {
                              "maximum": 9007199254740991,
                              "minimum": -9007199254740991,
                              "type": "integer"
                            },
                            "template": {
                              "type": "string"
                            }
                          },
                          "type": "object"
                        },
                        {
                          "type": "null"
                        }
                      ]
                    },
                    "type": {
                      "type": "string"
                    },
                    "value": {}
                  },
                  "required": [
                    "op",
                    "field",
                    "value"
                  ],
                  "type": "object"
                },
                {
                  "additionalProperties": false,
                  "properties": {
                    "field": {
                      "type": "null"
                    },
                    "op": {
                      "const": "set-split-amount",
                      "type": "string"
                    },
                    "options": {
                      "anyOf": [
                        {
                          "additionalProperties": false,
                          "properties": {
                            "formula": {
                              "type": "string"
                            },
                            "method": {
                              "enum": [
                                "fixed-amount",
                                "fixed-percent",
                                "formula",
                                "remainder"
                              ],
                              "type": "string"
                            },
                            "splitIndex": {
                              "maximum": 9007199254740991,
                              "minimum": -9007199254740991,
                              "type": "integer"
                            }
                          },
                          "required": [
                            "method"
                          ],
                          "type": "object"
                        },
                        {
                          "type": "null"
                        }
                      ]
                    },
                    "type": {
                      "type": "string"
                    },
                    "value": {
                      "anyOf": [
                        {
                          "maximum": 9007199254740991,
                          "minimum": -9007199254740991,
                          "type": "integer"
                        },
                        {
                          "type": "null"
                        }
                      ]
                    }
                  },
                  "required": [
                    "op",
                    "value"
                  ],
                  "type": "object"
                },
                {
                  "additionalProperties": false,
                  "properties": {
                    "field": {
                      "type": "null"
                    },
                    "op": {
                      "const": "link-schedule",
                      "type": "string"
                    },
                    "type": {
                      "type": "string"
                    },
                    "value": {
                      "maxLength": 512,
                      "minLength": 1,
                      "type": "string"
                    }
                  },
                  "required": [
                    "op",
                    "value"
                  ],
                  "type": "object"
                },
                {
                  "additionalProperties": false,
                  "properties": {
                    "field": {
                      "const": "notes",
                      "type": "string"
                    },
                    "op": {
                      "const": "prepend-notes",
                      "type": "string"
                    },
                    "type": {
                      "type": "string"
                    },
                    "value": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "op",
                    "value"
                  ],
                  "type": "object"
                },
                {
                  "additionalProperties": false,
                  "properties": {
                    "field": {
                      "const": "notes",
                      "type": "string"
                    },
                    "op": {
                      "const": "append-notes",
                      "type": "string"
                    },
                    "type": {
                      "type": "string"
                    },
                    "value": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "op",
                    "value"
                  ],
                  "type": "object"
                },
                {
                  "additionalProperties": false,
                  "properties": {
                    "field": {
                      "type": "null"
                    },
                    "op": {
                      "const": "delete-transaction",
                      "type": "string"
                    },
                    "type": {
                      "type": "string"
                    },
                    "value": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "op",
                    "value"
                  ],
                  "type": "object"
                }
              ]
            },
            "type": "array"
          },
          "conditions": {
            "items": {
              "additionalProperties": false,
              "properties": {
                "conditionsOp": {
                  "enum": [
                    "and",
                    "or"
                  ],
                  "type": "string"
                },
                "customName": {
                  "type": "string"
                },
                "field": {
                  "enum": [
                    "account",
                    "category",
                    "category_group",
                    "amount",
                    "date",
                    "notes",
                    "payee",
                    "imported_payee",
                    "saved",
                    "cleared",
                    "reconciled",
                    "transfer"
                  ],
                  "type": "string"
                },
                "op": {
                  "enum": [
                    "is",
                    "isNot",
                    "oneOf",
                    "notOneOf",
                    "contains",
                    "doesNotContain",
                    "matches",
                    "onBudget",
                    "offBudget",
                    "isapprox",
                    "isbetween",
                    "gt",
                    "gte",
                    "lt",
                    "lte",
                    "hasTags",
                    "hasAnyTag"
                  ],
                  "type": "string"
                },
                "options": {
                  "anyOf": [
                    {
                      "additionalProperties": false,
                      "properties": {
                        "inflow": {
                          "type": "boolean"
                        },
                        "month": {
                          "type": "boolean"
                        },
                        "outflow": {
                          "type": "boolean"
                        },
                        "year": {
                          "type": "boolean"
                        }
                      },
                      "type": "object"
                    },
                    {
                      "type": "null"
                    }
                  ]
                },
                "queryFilter": {
                  "additionalProperties": {
                    "additionalProperties": false,
                    "properties": {
                      "$oneof": {
                        "items": {
                          "type": "string"
                        },
                        "type": "array"
                      }
                    },
                    "required": [
                      "$oneof"
                    ],
                    "type": "object"
                  },
                  "propertyNames": {
                    "type": "string"
                  },
                  "type": "object"
                },
                "type": {
                  "enum": [
                    "id",
                    "boolean",
                    "date",
                    "number",
                    "string"
                  ],
                  "type": "string"
                },
                "value": {}
              },
              "required": [
                "field",
                "op",
                "value"
              ],
              "type": "object"
            },
            "type": "array"
          },
          "conditionsOp": {
            "enum": [
              "and",
              "or"
            ],
            "type": "string"
          },
          "id": {
            "maxLength": 512,
            "minLength": 1,
            "type": "string"
          },
          "stage": {
            "enum": [
              "pre",
              "default",
              "post"
            ],
            "type": "string"
          },
          "writable": {
            "type": "boolean"
          },
          "writeRestriction": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "stage",
          "conditionsOp",
          "conditions",
          "actions",
          "writable"
        ],
        "type": "object"
      },
      "type": "array"
    }
  },
  "required": [
    "rules"
  ],
  "type": "object"
}
```

</details>

## `actual_list_schedules`

- Title: List Actual schedules
- Domain: `schedules`
- Description: List stable schedule projections with bounded pagination and optional account/completion filters.
- Capability: `read`
- Mutation-capable: No
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`, `MAX_ENTITY_NAME_LENGTH`, `MAX_TEXT_LENGTH`, `MAX_SCHEDULE_RESULTS`, `MAX_SCHEDULE_OFFSET`
- Runtime guards: None
- Synchronization: `none`
- Partial failure: `none`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/read.integration.test.ts` — validates schedule, summary, and runtime read contracts without mutation
- Compiled stdio E2E evidence: `test/e2e/read.e2e.test.ts` — reads schedules, ledger summaries, and sanitized runtime status through compiled stdio

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Bounded schedule list filters and pagination.",
  "properties": {
    "accountId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    },
    "completed": {
      "type": "boolean"
    },
    "limit": {
      "default": 100,
      "maximum": 250,
      "minimum": 1,
      "type": "integer"
    },
    "offset": {
      "default": 0,
      "maximum": 10000,
      "minimum": 0,
      "type": "integer"
    }
  },
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Filtered and bounded schedule list.",
  "properties": {
    "page": {
      "additionalProperties": false,
      "properties": {
        "limit": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "offset": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "returned": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        },
        "total": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        }
      },
      "required": [
        "limit",
        "offset",
        "returned",
        "total"
      ],
      "type": "object"
    },
    "schedules": {
      "items": {
        "additionalProperties": false,
        "description": "Stable schedule projection without protected rule internals.",
        "properties": {
          "accountId": {
            "anyOf": [
              {
                "maxLength": 512,
                "minLength": 1,
                "type": "string"
              },
              {
                "type": "null"
              }
            ]
          },
          "amount": {
            "anyOf": [
              {
                "oneOf": [
                  {
                    "additionalProperties": false,
                    "properties": {
                      "amount": {
                        "maximum": 9007199254740991,
                        "minimum": -9007199254740991,
                        "type": "integer"
                      },
                      "type": {
                        "const": "exact",
                        "type": "string"
                      }
                    },
                    "required": [
                      "type",
                      "amount"
                    ],
                    "type": "object"
                  },
                  {
                    "additionalProperties": false,
                    "properties": {
                      "amount": {
                        "maximum": 9007199254740991,
                        "minimum": -9007199254740991,
                        "type": "integer"
                      },
                      "type": {
                        "const": "approximate",
                        "type": "string"
                      }
                    },
                    "required": [
                      "type",
                      "amount"
                    ],
                    "type": "object"
                  },
                  {
                    "additionalProperties": false,
                    "properties": {
                      "maxAmount": {
                        "maximum": 9007199254740991,
                        "minimum": -9007199254740991,
                        "type": "integer"
                      },
                      "minAmount": {
                        "maximum": 9007199254740991,
                        "minimum": -9007199254740991,
                        "type": "integer"
                      },
                      "type": {
                        "const": "between",
                        "type": "string"
                      }
                    },
                    "required": [
                      "type",
                      "minAmount",
                      "maxAmount"
                    ],
                    "type": "object"
                  }
                ]
              },
              {
                "type": "null"
              }
            ]
          },
          "completed": {
            "type": "boolean"
          },
          "date": {
            "anyOf": [
              {
                "oneOf": [
                  {
                    "additionalProperties": false,
                    "properties": {
                      "date": {
                        "type": "string"
                      },
                      "type": {
                        "const": "oneTime",
                        "type": "string"
                      }
                    },
                    "required": [
                      "type",
                      "date"
                    ],
                    "type": "object"
                  },
                  {
                    "additionalProperties": false,
                    "properties": {
                      "end": {
                        "default": {
                          "type": "never"
                        },
                        "oneOf": [
                          {
                            "additionalProperties": false,
                            "properties": {
                              "type": {
                                "const": "never",
                                "type": "string"
                              }
                            },
                            "required": [
                              "type"
                            ],
                            "type": "object"
                          },
                          {
                            "additionalProperties": false,
                            "properties": {
                              "occurrences": {
                                "exclusiveMinimum": 0,
                                "maximum": 9007199254740991,
                                "type": "integer"
                              },
                              "type": {
                                "const": "afterOccurrences",
                                "type": "string"
                              }
                            },
                            "required": [
                              "type",
                              "occurrences"
                            ],
                            "type": "object"
                          },
                          {
                            "additionalProperties": false,
                            "properties": {
                              "date": {
                                "type": "string"
                              },
                              "type": {
                                "const": "onDate",
                                "type": "string"
                              }
                            },
                            "required": [
                              "type",
                              "date"
                            ],
                            "type": "object"
                          }
                        ]
                      },
                      "frequency": {
                        "enum": [
                          "daily",
                          "weekly",
                          "monthly",
                          "yearly"
                        ],
                        "type": "string"
                      },
                      "interval": {
                        "exclusiveMinimum": 0,
                        "maximum": 9007199254740991,
                        "type": "integer"
                      },
                      "patterns": {
                        "items": {
                          "additionalProperties": false,
                          "properties": {
                            "type": {
                              "enum": [
                                "day",
                                "SU",
                                "MO",
                                "TU",
                                "WE",
                                "TH",
                                "FR",
                                "SA"
                              ],
                              "type": "string"
                            },
                            "value": {
                              "maximum": 9007199254740991,
                              "minimum": -9007199254740991,
                              "type": "integer"
                            }
                          },
                          "required": [
                            "type",
                            "value"
                          ],
                          "type": "object"
                        },
                        "minItems": 1,
                        "type": "array"
                      },
                      "start": {
                        "type": "string"
                      },
                      "type": {
                        "const": "recurring",
                        "type": "string"
                      },
                      "weekend": {
                        "default": "none",
                        "enum": [
                          "none",
                          "before",
                          "after"
                        ],
                        "type": "string"
                      }
                    },
                    "required": [
                      "type",
                      "frequency",
                      "start",
                      "interval",
                      "weekend",
                      "end"
                    ],
                    "type": "object"
                  }
                ]
              },
              {
                "type": "null"
              }
            ]
          },
          "id": {
            "maxLength": 512,
            "minLength": 1,
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "nextDate": {
            "type": "string"
          },
          "payeeId": {
            "anyOf": [
              {
                "maxLength": 512,
                "minLength": 1,
                "type": "string"
              },
              {
                "type": "null"
              }
            ]
          },
          "postsTransaction": {
            "type": "boolean"
          },
          "unsupportedReasons": {
            "items": {
              "type": "string"
            },
            "type": "array"
          },
          "writable": {
            "type": "boolean"
          }
        },
        "required": [
          "id",
          "accountId",
          "payeeId",
          "amount",
          "date",
          "completed",
          "postsTransaction",
          "writable",
          "unsupportedReasons"
        ],
        "type": "object"
      },
      "type": "array"
    },
    "scope": {
      "additionalProperties": false,
      "properties": {
        "accountId": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "completed": {
          "type": "boolean"
        }
      },
      "type": "object"
    }
  },
  "required": [
    "schedules",
    "scope",
    "page"
  ],
  "type": "object"
}
```

</details>

## `actual_list_transfer_payees`

- Title: List Actual transfer payees
- Domain: `transfers`
- Description: List official transfer payees with exact destination account metadata.
- Capability: `read`
- Mutation-capable: No
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: `MAX_ENTITY_NAME_LENGTH`, `MAX_TEXT_LENGTH`
- Runtime guards: None
- Synchronization: `none`
- Partial failure: `none`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/read.integration.test.ts` — reads transfer payees, transfer search, diagnostics, and reconciliation without mutation
- Compiled stdio E2E evidence: `test/e2e/read.e2e.test.ts` — exercises transfer, diagnostic, and reconciliation reads through compiled stdio

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "No input is required.",
  "properties": {},
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Official transfer payees with resolved destination account metadata.",
  "properties": {
    "transferPayees": {
      "items": {
        "additionalProperties": false,
        "properties": {
          "accountClosed": {
            "type": "boolean"
          },
          "accountId": {
            "maxLength": 512,
            "minLength": 1,
            "type": "string"
          },
          "accountName": {
            "type": "string"
          },
          "accountOffBudget": {
            "type": "boolean"
          },
          "id": {
            "maxLength": 512,
            "minLength": 1,
            "type": "string"
          },
          "name": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "name",
          "accountId",
          "accountName",
          "accountClosed",
          "accountOffBudget"
        ],
        "type": "object"
      },
      "type": "array"
    }
  },
  "required": [
    "transferPayees"
  ],
  "type": "object"
}
```

</details>

## `actual_merge_payees`

- Title: Merge Actual payees
- Domain: `payees`
- Description: DESTRUCTIVE OPERATION: Preflight and merge ordinary source payees into one distinct ordinary target only with literal confirmation.
- Capability: `destructive`
- Mutation-capable: Yes
- Destructive: Yes
- Idempotent: No
- Confirmation: `confirm-destructive`
- Bounds: `MAX_ID_LENGTH`, `MAX_ENTITY_NAME_LENGTH`, `MAX_PAYEE_MERGE_SOURCES`
- Runtime guards: `ACTUAL_MCP_READ_ONLY`, then `ACTUAL_MCP_ALLOW_DESTRUCTIVE`
- Synchronization: `write-and-sync`
- Partial failure: `multi-step`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/write.integration.test.ts` — merges uniquely owned ordinary payees and remaps an owned source transaction
- Compiled stdio E2E evidence: `test/e2e/write.e2e.test.ts` — merges uniquely owned payees with an owned source transaction through MCP-only calls

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "DESTRUCTIVE OPERATION input for merging ordinary source payees into one distinct ordinary target.",
  "properties": {
    "confirmDestructive": {
      "const": true,
      "type": "boolean"
    },
    "sourcePayeeIds": {
      "items": {
        "maxLength": 512,
        "minLength": 1,
        "type": "string"
      },
      "maxItems": 100,
      "minItems": 1,
      "type": "array"
    },
    "targetPayeeId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    }
  },
  "required": [
    "sourcePayeeIds",
    "targetPayeeId",
    "confirmDestructive"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Verified result of one official payee merge.",
  "properties": {
    "impacts": {
      "items": {
        "additionalProperties": false,
        "properties": {
          "payeeId": {
            "maxLength": 512,
            "minLength": 1,
            "type": "string"
          },
          "payeeName": {
            "type": "string"
          },
          "relatedRuleCount": {
            "maximum": 9007199254740991,
            "minimum": 0,
            "type": "integer"
          },
          "relatedTransactionCount": {
            "maximum": 9007199254740991,
            "minimum": 0,
            "type": "integer"
          }
        },
        "required": [
          "payeeId",
          "payeeName",
          "relatedTransactionCount",
          "relatedRuleCount"
        ],
        "type": "object"
      },
      "minItems": 1,
      "type": "array"
    },
    "mergedSourcePayeeIds": {
      "items": {
        "maxLength": 512,
        "minLength": 1,
        "type": "string"
      },
      "minItems": 1,
      "type": "array"
    },
    "success": {
      "const": true,
      "type": "boolean"
    },
    "targetPayee": {
      "additionalProperties": false,
      "description": "One Actual payee with transfer context preserved when supplied by the official API.",
      "properties": {
        "id": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "name": {
          "type": "string"
        },
        "transferAccountId": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "id",
        "name"
      ],
      "type": "object"
    }
  },
  "required": [
    "success",
    "targetPayee",
    "mergedSourcePayeeIds",
    "impacts"
  ],
  "type": "object"
}
```

</details>

## `actual_move_category`

- Title: Move Actual category
- Domain: `categories`
- Description: Move a category to another group only when both persisted income or expense types match.
- Capability: `write`
- Mutation-capable: Yes
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`, `MAX_ENTITY_NAME_LENGTH`
- Runtime guards: `ACTUAL_MCP_READ_ONLY`
- Synchronization: `write-and-sync`
- Partial failure: `sync-after-write`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/write.integration.test.ts` — administers isolated account and category structure with exact-ID cleanup and complete safety preflights
- Compiled stdio E2E evidence: `test/e2e/write.e2e.test.ts` — exercises the complete structural lifecycle through real MCP stdio

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Category and same-type target group for a semantic move.",
  "properties": {
    "categoryId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    },
    "targetGroupId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    }
  },
  "required": [
    "categoryId",
    "targetGroupId"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Persisted category state after a structural operation.",
  "properties": {
    "category": {
      "additionalProperties": false,
      "description": "Normalized category administration entity.",
      "properties": {
        "groupId": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "hidden": {
          "type": "boolean"
        },
        "id": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "isIncome": {
          "type": "boolean"
        },
        "name": {
          "type": "string"
        }
      },
      "required": [
        "id",
        "name",
        "groupId",
        "isIncome",
        "hidden"
      ],
      "type": "object"
    },
    "changed": {
      "description": "Whether this call changed persisted Actual state.",
      "type": "boolean"
    },
    "success": {
      "const": true,
      "type": "boolean"
    }
  },
  "required": [
    "success",
    "changed",
    "category"
  ],
  "type": "object"
}
```

</details>

## `actual_preview_import`

- Title: Preview Actual transaction import
- Domain: `import`
- Description: Run the official reconciliation pipeline in read-only dry-run mode and return truthful preview evidence plus a request fingerprint.
- Capability: `read`
- Mutation-capable: No
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`, `MAX_TEXT_LENGTH`, `MAX_IMPORT_BATCH`
- Runtime guards: None
- Synchronization: `none`
- Partial failure: `none`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/write.integration.test.ts` — proves official import preview purity and binds the reviewed request to execution
- Compiled stdio E2E evidence: `test/e2e/write.e2e.test.ts` — previews without mutation, binds fingerprinted import, and verifies lookup/search through compiled stdio

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Read-only official import preview request; dry-run cannot be disabled.",
  "properties": {
    "accountId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    },
    "defaultCleared": {
      "type": "boolean"
    },
    "reimportDeleted": {
      "type": "boolean"
    },
    "transactions": {
      "items": {
        "additionalProperties": false,
        "description": "One transaction to reconcile through the official import API.",
        "properties": {
          "amount": {
            "maximum": 9007199254740991,
            "minimum": -9007199254740991,
            "type": "integer"
          },
          "category": {
            "maxLength": 512,
            "minLength": 1,
            "type": "string"
          },
          "cleared": {
            "type": "boolean"
          },
          "date": {
            "type": "string"
          },
          "imported_id": {
            "maxLength": 512,
            "minLength": 1,
            "type": "string"
          },
          "imported_payee": {
            "maxLength": 10000,
            "type": "string"
          },
          "notes": {
            "maxLength": 10000,
            "type": "string"
          },
          "payee": {
            "maxLength": 512,
            "minLength": 1,
            "type": "string"
          },
          "payee_name": {
            "maxLength": 10000,
            "type": "string"
          }
        },
        "required": [
          "date",
          "amount",
          "imported_id"
        ],
        "type": "object"
      },
      "maxItems": 500,
      "minItems": 1,
      "type": "array"
    }
  },
  "required": [
    "accountId",
    "transactions"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Sanitized official reconciliation preview evidence and request fingerprint.",
  "properties": {
    "errorCount": {
      "maximum": 9007199254740991,
      "minimum": 0,
      "type": "integer"
    },
    "errors": {
      "items": {
        "additionalProperties": false,
        "properties": {
          "message": {
            "type": "string"
          }
        },
        "required": [
          "message"
        ],
        "type": "object"
      },
      "type": "array"
    },
    "evidence": {
      "items": {
        "additionalProperties": false,
        "properties": {
          "existingTransactionId": {
            "maxLength": 512,
            "minLength": 1,
            "type": "string"
          },
          "ignored": {
            "type": "boolean"
          },
          "importedId": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ]
          },
          "tombstone": {
            "type": "boolean"
          }
        },
        "required": [
          "importedId"
        ],
        "type": "object"
      },
      "type": "array"
    },
    "existingTransactionIds": {
      "items": {
        "maxLength": 512,
        "minLength": 1,
        "type": "string"
      },
      "type": "array"
    },
    "ignoredCount": {
      "maximum": 9007199254740991,
      "minimum": 0,
      "type": "integer"
    },
    "previewOnlyIds": {
      "description": "Generated preview identifiers that are not persisted transaction IDs.",
      "items": {
        "maxLength": 512,
        "minLength": 1,
        "type": "string"
      },
      "type": "array"
    },
    "requestFingerprint": {
      "pattern": "^v1:[a-f0-9]{64}$",
      "type": "string"
    },
    "wouldAddCount": {
      "maximum": 9007199254740991,
      "minimum": 0,
      "type": "integer"
    },
    "wouldUpdateCount": {
      "maximum": 9007199254740991,
      "minimum": 0,
      "type": "integer"
    }
  },
  "required": [
    "requestFingerprint",
    "wouldAddCount",
    "wouldUpdateCount",
    "ignoredCount",
    "errorCount",
    "previewOnlyIds",
    "existingTransactionIds",
    "errors",
    "evidence"
  ],
  "type": "object"
}
```

</details>

## `actual_reopen_account`

- Title: Reopen Actual account
- Domain: `accounts`
- Description: Reopen a closed Actual account, synchronize, and verify the desired state.
- Capability: `write`
- Mutation-capable: Yes
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`
- Runtime guards: `ACTUAL_MCP_READ_ONLY`
- Synchronization: `write-and-sync`
- Partial failure: `sync-after-write`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/write.integration.test.ts` — administers isolated account and category structure with exact-ID cleanup and complete safety preflights
- Compiled stdio E2E evidence: `test/e2e/write.e2e.test.ts` — exercises the complete structural lifecycle through real MCP stdio

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Opaque identifier of the requested account.",
  "properties": {
    "accountId": {
      "description": "Opaque Actual account identifier.",
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    }
  },
  "required": [
    "accountId"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Persisted account state after a structural operation.",
  "properties": {
    "account": {
      "additionalProperties": false,
      "description": "Normalized Actual account.",
      "properties": {
        "balance": {
          "description": "Ledger balance in integer minor units.",
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "balanceError": {
          "description": "Sanitized balance lookup error, when balance retrieval failed.",
          "type": "string"
        },
        "closed": {
          "description": "Whether the account is closed.",
          "type": "boolean"
        },
        "id": {
          "description": "Opaque Actual account identifier.",
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "name": {
          "description": "User-authored account name, returned verbatim.",
          "type": "string"
        },
        "offbudget": {
          "description": "Whether the account is excluded from the budget.",
          "type": "boolean"
        }
      },
      "required": [
        "id",
        "name",
        "offbudget",
        "closed"
      ],
      "type": "object"
    },
    "changed": {
      "description": "Whether this call changed persisted Actual state.",
      "type": "boolean"
    },
    "success": {
      "const": true,
      "type": "boolean"
    }
  },
  "required": [
    "success",
    "changed",
    "account"
  ],
  "type": "object"
}
```

</details>

## `actual_reset_budget_hold`

- Title: Reset manual budget hold
- Domain: `budget`
- Description: Reset only the manual envelope hold and report observed forNextMonth aggregates without attributing automatic holds.
- Capability: `write`
- Mutation-capable: Yes
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`
- Runtime guards: `ACTUAL_MCP_READ_ONLY`
- Synchronization: `write-and-sync`
- Partial failure: `sync-after-write`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/write.integration.test.ts` — uses dynamically selected clean months for verified budget amount, carryover, hold/reset, and copy writes
- Compiled stdio E2E evidence: `test/e2e/write.e2e.test.ts` — executes guarded budget writes and copy through compiled MCP stdio with exact cleanup

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "One available Actual budget month in strict YYYY-MM form.",
  "properties": {
    "month": {
      "type": "string"
    }
  },
  "required": [
    "month"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Observed aggregate before and after resetting only the manual envelope hold.",
  "properties": {
    "changed": {
      "description": "Whether this call changed persisted Actual state.",
      "type": "boolean"
    },
    "currentForNextMonth": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    },
    "month": {
      "type": "string"
    },
    "previousForNextMonth": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    },
    "success": {
      "const": true,
      "type": "boolean"
    }
  },
  "required": [
    "success",
    "changed",
    "month",
    "previousForNextMonth",
    "currentForNextMonth"
  ],
  "type": "object"
}
```

</details>

## `actual_search_transactions`

- Title: Search Actual transactions
- Domain: `transactions`
- Description: Search transactions across accounts with typed filters, signed amounts, split-aware deterministic pagination, and optional totals.
- Capability: `read`
- Mutation-capable: No
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`, `MAX_TEXT_LENGTH`, `MAX_DATE_RANGE_DAYS`, `MAX_TRANSACTION_SEARCH_RESULTS`, `MAX_TRANSACTION_SEARCH_OFFSET`
- Runtime guards: None
- Synchronization: `none`
- Partial failure: `none`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/read.integration.test.ts` — performs exact lookup and typed cross-account search through the installed query path
- Compiled stdio E2E evidence: `test/e2e/read.e2e.test.ts` — executes exact lookup and advanced search filters, ordering, pagination, totals, and split modes through compiled stdio

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Bounded typed cross-account transaction search.",
  "properties": {
    "accountIds": {
      "items": {
        "maxLength": 512,
        "minLength": 1,
        "type": "string"
      },
      "maxItems": 250,
      "minItems": 1,
      "type": "array"
    },
    "categoryIds": {
      "items": {
        "maxLength": 512,
        "minLength": 1,
        "type": "string"
      },
      "maxItems": 250,
      "minItems": 1,
      "type": "array"
    },
    "cleared": {
      "type": "boolean"
    },
    "endDate": {
      "type": "string"
    },
    "importSource": {
      "default": "any",
      "enum": [
        "any",
        "manual",
        "imported"
      ],
      "type": "string"
    },
    "includeTotals": {
      "default": false,
      "type": "boolean"
    },
    "limit": {
      "default": 100,
      "maximum": 250,
      "minimum": 1,
      "type": "integer"
    },
    "maxAmount": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    },
    "minAmount": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    },
    "offset": {
      "default": 0,
      "maximum": 10000,
      "minimum": 0,
      "type": "integer"
    },
    "payeeIds": {
      "items": {
        "maxLength": 512,
        "minLength": 1,
        "type": "string"
      },
      "maxItems": 250,
      "minItems": 1,
      "type": "array"
    },
    "sort": {
      "default": "date_desc",
      "enum": [
        "date_desc",
        "date_asc",
        "amount_desc",
        "amount_asc",
        "payee_asc",
        "payee_desc",
        "category_asc",
        "category_desc"
      ],
      "type": "string"
    },
    "splitMode": {
      "default": "inline",
      "enum": [
        "inline",
        "grouped"
      ],
      "type": "string"
    },
    "startDate": {
      "type": "string"
    },
    "text": {
      "maxLength": 10000,
      "minLength": 1,
      "type": "string"
    },
    "transactionIds": {
      "items": {
        "maxLength": 512,
        "minLength": 1,
        "type": "string"
      },
      "maxItems": 250,
      "minItems": 1,
      "type": "array"
    },
    "transferState": {
      "default": "any",
      "enum": [
        "any",
        "transfer",
        "non-transfer"
      ],
      "type": "string"
    },
    "uncategorizedOnly": {
      "type": "boolean"
    }
  },
  "required": [
    "startDate",
    "endDate"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$defs": {
    "__schema0": {
      "additionalProperties": false,
      "description": "Normalized Actual transaction. Explicit null values from Actual are preserved; absent optional fields remain absent.",
      "properties": {
        "account": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "amount": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "category": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "category_name": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "cleared": {
          "type": "boolean"
        },
        "date": {
          "type": "string"
        },
        "id": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "imported_id": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "imported_payee": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "is_child": {
          "type": "boolean"
        },
        "is_parent": {
          "type": "boolean"
        },
        "isTransfer": {
          "type": "boolean"
        },
        "notes": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "parent_id": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "payee": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "payee_name": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "reconciled": {
          "type": "boolean"
        },
        "starting_balance_flag": {
          "type": "boolean"
        },
        "subtransactions": {
          "items": {
            "$ref": "#/$defs/__schema0"
          },
          "type": "array"
        },
        "transfer_id": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "id",
        "account",
        "date",
        "amount"
      ],
      "type": "object"
    }
  },
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Deterministic transaction search page and optional supported totals.",
  "properties": {
    "page": {
      "additionalProperties": false,
      "properties": {
        "limit": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "offset": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "returned": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        }
      },
      "required": [
        "limit",
        "offset",
        "returned"
      ],
      "type": "object"
    },
    "splitMode": {
      "enum": [
        "inline",
        "grouped"
      ],
      "type": "string"
    },
    "totals": {
      "oneOf": [
        {
          "additionalProperties": false,
          "properties": {
            "amount": {
              "maximum": 9007199254740991,
              "minimum": -9007199254740991,
              "type": "integer"
            },
            "matched": {
              "maximum": 9007199254740991,
              "minimum": 0,
              "type": "integer"
            },
            "supported": {
              "const": true,
              "type": "boolean"
            }
          },
          "required": [
            "supported",
            "matched",
            "amount"
          ],
          "type": "object"
        },
        {
          "additionalProperties": false,
          "properties": {
            "reason": {
              "type": "string"
            },
            "supported": {
              "const": false,
              "type": "boolean"
            }
          },
          "required": [
            "supported",
            "reason"
          ],
          "type": "object"
        }
      ]
    },
    "transactions": {
      "items": {
        "$ref": "#/$defs/__schema0"
      },
      "type": "array"
    }
  },
  "required": [
    "transactions",
    "page",
    "splitMode"
  ],
  "type": "object"
}
```

</details>

## `actual_search_transfers`

- Title: Search Actual transfers
- Domain: `transfers`
- Description: Search bounded reciprocal transfer evidence with integrity filters and deterministic pagination.
- Capability: `read`
- Mutation-capable: No
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`, `MAX_TEXT_LENGTH`, `MAX_DATE_RANGE_DAYS`, `MAX_TRANSACTION_SEARCH_RESULTS`, `MAX_TRANSACTION_SEARCH_OFFSET`, `MAX_LEDGER_SCAN_RESULTS`, `LEDGER_QUERY_SENTINEL_LIMIT`
- Runtime guards: None
- Synchronization: `none`
- Partial failure: `none`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/read.integration.test.ts` — reads transfer payees, transfer search, diagnostics, and reconciliation without mutation
- Compiled stdio E2E evidence: `test/e2e/read.e2e.test.ts` — exercises transfer, diagnostic, and reconciliation reads through compiled stdio

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Bounded deterministic transfer-pair search.",
  "properties": {
    "accountIds": {
      "items": {
        "maxLength": 512,
        "minLength": 1,
        "type": "string"
      },
      "maxItems": 250,
      "minItems": 1,
      "type": "array"
    },
    "endDate": {
      "type": "string"
    },
    "integrity": {
      "default": "any",
      "enum": [
        "any",
        "VALID",
        "INVALID"
      ],
      "type": "string"
    },
    "limit": {
      "default": 100,
      "maximum": 250,
      "minimum": 1,
      "type": "integer"
    },
    "maxMagnitude": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    },
    "minMagnitude": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    },
    "offset": {
      "default": 0,
      "maximum": 10000,
      "minimum": 0,
      "type": "integer"
    },
    "sort": {
      "default": "date_desc",
      "enum": [
        "date_desc",
        "date_asc",
        "magnitude_desc",
        "magnitude_asc"
      ],
      "type": "string"
    },
    "startDate": {
      "type": "string"
    }
  },
  "required": [
    "startDate",
    "endDate"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$defs": {
    "__schema0": {
      "additionalProperties": false,
      "description": "Normalized Actual transaction. Explicit null values from Actual are preserved; absent optional fields remain absent.",
      "properties": {
        "account": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "amount": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "category": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "category_name": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "cleared": {
          "type": "boolean"
        },
        "date": {
          "type": "string"
        },
        "id": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "imported_id": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "imported_payee": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "is_child": {
          "type": "boolean"
        },
        "is_parent": {
          "type": "boolean"
        },
        "isTransfer": {
          "type": "boolean"
        },
        "notes": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "parent_id": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "payee": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "payee_name": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "reconciled": {
          "type": "boolean"
        },
        "starting_balance_flag": {
          "type": "boolean"
        },
        "subtransactions": {
          "items": {
            "$ref": "#/$defs/__schema0"
          },
          "type": "array"
        },
        "transfer_id": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "id",
        "account",
        "date",
        "amount"
      ],
      "type": "object"
    }
  },
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Transfer pairs, complete pre-pagination counts, and deterministic page metadata.",
  "properties": {
    "counts": {
      "additionalProperties": false,
      "properties": {
        "invalid": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        },
        "matched": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        },
        "valid": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        }
      },
      "required": [
        "matched",
        "valid",
        "invalid"
      ],
      "type": "object"
    },
    "page": {
      "additionalProperties": false,
      "properties": {
        "limit": {
          "exclusiveMinimum": 0,
          "maximum": 9007199254740991,
          "type": "integer"
        },
        "offset": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        },
        "returned": {
          "maximum": 9007199254740991,
          "minimum": 0,
          "type": "integer"
        }
      },
      "required": [
        "limit",
        "offset",
        "returned"
      ],
      "type": "object"
    },
    "transfers": {
      "items": {
        "additionalProperties": false,
        "description": "Canonical observed reciprocal transfer pair and deterministic integrity evidence.",
        "properties": {
          "fromTransaction": {
            "anyOf": [
              {
                "$ref": "#/$defs/__schema0"
              },
              {
                "type": "null"
              }
            ]
          },
          "integrity": {
            "enum": [
              "VALID",
              "INVALID"
            ],
            "type": "string"
          },
          "magnitude": {
            "anyOf": [
              {
                "maximum": 9007199254740991,
                "minimum": -9007199254740991,
                "type": "integer"
              },
              {
                "type": "null"
              }
            ]
          },
          "pairKey": {
            "pattern": "^v1:[a-f0-9]{64}$",
            "type": "string"
          },
          "reasonCodes": {
            "items": {
              "enum": [
                "MISSING_COUNTERPART",
                "NON_RECIPROCAL_RELATIONSHIP",
                "SAME_ACCOUNT",
                "ZERO_AMOUNT",
                "SAME_SIGN",
                "MAGNITUDE_MISMATCH",
                "MALFORMED_RELATIONSHIP_ID"
              ],
              "type": "string"
            },
            "type": "array"
          },
          "toTransaction": {
            "anyOf": [
              {
                "$ref": "#/$defs/__schema0"
              },
              {
                "type": "null"
              }
            ]
          },
          "transactionA": {
            "anyOf": [
              {
                "$ref": "#/$defs/__schema0"
              },
              {
                "type": "null"
              }
            ]
          },
          "transactionB": {
            "anyOf": [
              {
                "$ref": "#/$defs/__schema0"
              },
              {
                "type": "null"
              }
            ]
          }
        },
        "required": [
          "pairKey",
          "transactionA",
          "transactionB",
          "integrity",
          "reasonCodes",
          "fromTransaction",
          "toTransaction",
          "magnitude"
        ],
        "type": "object"
      },
      "type": "array"
    }
  },
  "required": [
    "transfers",
    "counts",
    "page"
  ],
  "type": "object"
}
```

</details>

## `actual_set_budget_amount`

- Title: Set category budget amount
- Domain: `budget`
- Description: Set and verify a desired signed category planning amount; zero clears the planned amount.
- Capability: `write`
- Mutation-capable: Yes
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`
- Runtime guards: `ACTUAL_MCP_READ_ONLY`
- Synchronization: `write-and-sync`
- Partial failure: `sync-after-write`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/write.integration.test.ts` — uses dynamically selected clean months for verified budget amount, carryover, hold/reset, and copy writes
- Compiled stdio E2E evidence: `test/e2e/write.e2e.test.ts` — executes guarded budget writes and copy through compiled MCP stdio with exact cleanup

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Desired signed category budget amount in integer minor units; zero clears planning.",
  "properties": {
    "amount": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    },
    "categoryId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    },
    "month": {
      "type": "string"
    }
  },
  "required": [
    "month",
    "categoryId",
    "amount"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Verified desired-state category budget amount result.",
  "properties": {
    "category": {
      "additionalProperties": false,
      "description": "Runtime-validated budget category preserving only installed SDK fields and signed values.",
      "properties": {
        "balance": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "budgeted": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "capabilities": {
          "additionalProperties": false,
          "properties": {
            "budgetAmount": {
              "description": "Whether the returned month shape exposes a numeric budgeted field for this category.",
              "type": "boolean"
            },
            "carryover": {
              "description": "Whether the returned expense-category shape exposes a boolean carryover field.",
              "type": "boolean"
            }
          },
          "required": [
            "budgetAmount",
            "carryover"
          ],
          "type": "object"
        },
        "carryover": {
          "type": "boolean"
        },
        "groupId": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "hidden": {
          "type": "boolean"
        },
        "id": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "isIncome": {
          "type": "boolean"
        },
        "name": {
          "type": "string"
        },
        "received": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "spent": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        }
      },
      "required": [
        "id",
        "name",
        "groupId",
        "isIncome",
        "hidden",
        "capabilities"
      ],
      "type": "object"
    },
    "categoryId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    },
    "changed": {
      "description": "Whether this call changed persisted Actual state.",
      "type": "boolean"
    },
    "currentAmount": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    },
    "month": {
      "type": "string"
    },
    "previousAmount": {
      "maximum": 9007199254740991,
      "minimum": -9007199254740991,
      "type": "integer"
    },
    "success": {
      "const": true,
      "type": "boolean"
    }
  },
  "required": [
    "success",
    "changed",
    "month",
    "categoryId",
    "previousAmount",
    "currentAmount",
    "category"
  ],
  "type": "object"
}
```

</details>

## `actual_set_budget_carryover`

- Title: Set expense budget carryover
- Domain: `budget`
- Description: Set and verify expense-category carryover prospectively from the selected month through later available months.
- Capability: `write`
- Mutation-capable: Yes
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`
- Runtime guards: `ACTUAL_MCP_READ_ONLY`
- Synchronization: `write-and-sync`
- Partial failure: `sync-after-write`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/write.integration.test.ts` — uses dynamically selected clean months for verified budget amount, carryover, hold/reset, and copy writes
- Compiled stdio E2E evidence: `test/e2e/write.e2e.test.ts` — executes guarded budget writes and copy through compiled MCP stdio with exact cleanup

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Desired expense-category carryover state, effective from the selected month forward.",
  "properties": {
    "carryover": {
      "type": "boolean"
    },
    "categoryId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    },
    "month": {
      "type": "string"
    }
  },
  "required": [
    "month",
    "categoryId",
    "carryover"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Verified prospective expense carryover result.",
  "properties": {
    "category": {
      "additionalProperties": false,
      "description": "Runtime-validated budget category preserving only installed SDK fields and signed values.",
      "properties": {
        "balance": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "budgeted": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "capabilities": {
          "additionalProperties": false,
          "properties": {
            "budgetAmount": {
              "description": "Whether the returned month shape exposes a numeric budgeted field for this category.",
              "type": "boolean"
            },
            "carryover": {
              "description": "Whether the returned expense-category shape exposes a boolean carryover field.",
              "type": "boolean"
            }
          },
          "required": [
            "budgetAmount",
            "carryover"
          ],
          "type": "object"
        },
        "carryover": {
          "type": "boolean"
        },
        "groupId": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "hidden": {
          "type": "boolean"
        },
        "id": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "isIncome": {
          "type": "boolean"
        },
        "name": {
          "type": "string"
        },
        "received": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "spent": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        }
      },
      "required": [
        "id",
        "name",
        "groupId",
        "isIncome",
        "hidden",
        "capabilities"
      ],
      "type": "object"
    },
    "categoryId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    },
    "changed": {
      "description": "Whether this call changed persisted Actual state.",
      "type": "boolean"
    },
    "currentCarryover": {
      "type": "boolean"
    },
    "effectiveFromMonth": {
      "type": "string"
    },
    "month": {
      "type": "string"
    },
    "previousCarryover": {
      "type": "boolean"
    },
    "success": {
      "const": true,
      "type": "boolean"
    },
    "verifiedThroughMonth": {
      "type": "string"
    }
  },
  "required": [
    "success",
    "changed",
    "month",
    "categoryId",
    "previousCarryover",
    "currentCarryover",
    "effectiveFromMonth",
    "verifiedThroughMonth",
    "category"
  ],
  "type": "object"
}
```

</details>

## `actual_sync`

- Title: Synchronize Actual budget
- Domain: `runtime`
- Description: Synchronize the loaded local budget with Actual Server.
- Capability: `write`
- Mutation-capable: Yes
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: None
- Runtime guards: `ACTUAL_MCP_READ_ONLY`
- Synchronization: `sync-only`
- Partial failure: `sync-failure`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/write.integration.test.ts` — performs an explicit sync and keeps the budget operational
- Compiled stdio E2E evidence: `test/e2e/write.e2e.test.ts` — updates, explicitly syncs, and reads the persisted change through MCP

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "No input is required.",
  "properties": {},
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Successful synchronization result and completion timestamp.",
  "properties": {
    "completedAt": {
      "format": "date-time",
      "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      "type": "string"
    },
    "durationMs": {
      "minimum": 0,
      "type": "number"
    },
    "success": {
      "const": true,
      "type": "boolean"
    },
    "synchronizedAt": {
      "format": "date-time",
      "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      "type": "string"
    }
  },
  "required": [
    "success",
    "synchronizedAt"
  ],
  "type": "object"
}
```

</details>

## `actual_unhide_category`

- Title: Unhide Actual category
- Domain: `categories`
- Description: Set an Actual category to visible and verify the persisted desired state.
- Capability: `write`
- Mutation-capable: Yes
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`, `MAX_ENTITY_NAME_LENGTH`
- Runtime guards: `ACTUAL_MCP_READ_ONLY`
- Synchronization: `write-and-sync`
- Partial failure: `sync-after-write`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/write.integration.test.ts` — administers isolated account and category structure with exact-ID cleanup and complete safety preflights
- Compiled stdio E2E evidence: `test/e2e/write.e2e.test.ts` — exercises the complete structural lifecycle through real MCP stdio

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Opaque identifier of the requested category.",
  "properties": {
    "categoryId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    }
  },
  "required": [
    "categoryId"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Persisted category state after a structural operation.",
  "properties": {
    "category": {
      "additionalProperties": false,
      "description": "Normalized category administration entity.",
      "properties": {
        "groupId": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "hidden": {
          "type": "boolean"
        },
        "id": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "isIncome": {
          "type": "boolean"
        },
        "name": {
          "type": "string"
        }
      },
      "required": [
        "id",
        "name",
        "groupId",
        "isIncome",
        "hidden"
      ],
      "type": "object"
    },
    "changed": {
      "description": "Whether this call changed persisted Actual state.",
      "type": "boolean"
    },
    "success": {
      "const": true,
      "type": "boolean"
    }
  },
  "required": [
    "success",
    "changed",
    "category"
  ],
  "type": "object"
}
```

</details>

## `actual_update_account`

- Title: Update Actual account
- Domain: `accounts`
- Description: Update only the name and/or off-budget state of an Actual account, then verify the persisted state.
- Capability: `write`
- Mutation-capable: Yes
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`, `MAX_ENTITY_NAME_LENGTH`
- Runtime guards: `ACTUAL_MCP_READ_ONLY`
- Synchronization: `write-and-sync`
- Partial failure: `sync-after-write`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/write.integration.test.ts` — administers isolated account and category structure with exact-ID cleanup and complete safety preflights
- Compiled stdio E2E evidence: `test/e2e/write.e2e.test.ts` — exercises the complete structural lifecycle through real MCP stdio

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Target account and one or more allowlisted name/offbudget updates.",
  "properties": {
    "accountId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    },
    "name": {
      "maxLength": 255,
      "minLength": 1,
      "type": "string"
    },
    "offbudget": {
      "type": "boolean"
    }
  },
  "required": [
    "accountId"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Persisted account state after a structural operation.",
  "properties": {
    "account": {
      "additionalProperties": false,
      "description": "Normalized Actual account.",
      "properties": {
        "balance": {
          "description": "Ledger balance in integer minor units.",
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "balanceError": {
          "description": "Sanitized balance lookup error, when balance retrieval failed.",
          "type": "string"
        },
        "closed": {
          "description": "Whether the account is closed.",
          "type": "boolean"
        },
        "id": {
          "description": "Opaque Actual account identifier.",
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "name": {
          "description": "User-authored account name, returned verbatim.",
          "type": "string"
        },
        "offbudget": {
          "description": "Whether the account is excluded from the budget.",
          "type": "boolean"
        }
      },
      "required": [
        "id",
        "name",
        "offbudget",
        "closed"
      ],
      "type": "object"
    },
    "changed": {
      "description": "Whether this call changed persisted Actual state.",
      "type": "boolean"
    },
    "success": {
      "const": true,
      "type": "boolean"
    }
  },
  "required": [
    "success",
    "changed",
    "account"
  ],
  "type": "object"
}
```

</details>

## `actual_update_category`

- Title: Rename Actual category
- Domain: `categories`
- Description: Rename an Actual category without changing its group, type, or visibility.
- Capability: `write`
- Mutation-capable: Yes
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`, `MAX_ENTITY_NAME_LENGTH`
- Runtime guards: `ACTUAL_MCP_READ_ONLY`
- Synchronization: `write-and-sync`
- Partial failure: `sync-after-write`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/write.integration.test.ts` — administers isolated account and category structure with exact-ID cleanup and complete safety preflights
- Compiled stdio E2E evidence: `test/e2e/write.e2e.test.ts` — exercises the complete structural lifecycle through real MCP stdio

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Category to rename; group, type, and visibility are not caller-controlled.",
  "properties": {
    "categoryId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    },
    "name": {
      "maxLength": 255,
      "minLength": 1,
      "type": "string"
    }
  },
  "required": [
    "categoryId",
    "name"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Persisted category state after a structural operation.",
  "properties": {
    "category": {
      "additionalProperties": false,
      "description": "Normalized category administration entity.",
      "properties": {
        "groupId": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "hidden": {
          "type": "boolean"
        },
        "id": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "isIncome": {
          "type": "boolean"
        },
        "name": {
          "type": "string"
        }
      },
      "required": [
        "id",
        "name",
        "groupId",
        "isIncome",
        "hidden"
      ],
      "type": "object"
    },
    "changed": {
      "description": "Whether this call changed persisted Actual state.",
      "type": "boolean"
    },
    "success": {
      "const": true,
      "type": "boolean"
    }
  },
  "required": [
    "success",
    "changed",
    "category"
  ],
  "type": "object"
}
```

</details>

## `actual_update_category_group`

- Title: Rename Actual category group
- Domain: `categories`
- Description: Rename an Actual category group without changing its type or visibility.
- Capability: `write`
- Mutation-capable: Yes
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`, `MAX_ENTITY_NAME_LENGTH`
- Runtime guards: `ACTUAL_MCP_READ_ONLY`
- Synchronization: `write-and-sync`
- Partial failure: `sync-after-write`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/write.integration.test.ts` — administers isolated account and category structure with exact-ID cleanup and complete safety preflights
- Compiled stdio E2E evidence: `test/e2e/write.e2e.test.ts` — exercises the complete structural lifecycle through real MCP stdio

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Category group to rename; type and visibility are not caller-controlled.",
  "properties": {
    "groupId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    },
    "name": {
      "maxLength": 255,
      "minLength": 1,
      "type": "string"
    }
  },
  "required": [
    "groupId",
    "name"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Persisted category-group state after a structural operation.",
  "properties": {
    "categoryGroup": {
      "additionalProperties": false,
      "description": "Normalized category-group administration entity.",
      "properties": {
        "hidden": {
          "type": "boolean"
        },
        "id": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "isIncome": {
          "type": "boolean"
        },
        "name": {
          "type": "string"
        }
      },
      "required": [
        "id",
        "name",
        "isIncome",
        "hidden"
      ],
      "type": "object"
    },
    "changed": {
      "description": "Whether this call changed persisted Actual state.",
      "type": "boolean"
    },
    "success": {
      "const": true,
      "type": "boolean"
    }
  },
  "required": [
    "success",
    "changed",
    "categoryGroup"
  ],
  "type": "object"
}
```

</details>

## `actual_update_payee`

- Title: Rename Actual payee
- Domain: `payees`
- Description: Rename one ordinary payee to the desired trimmed name; transfer payees are protected.
- Capability: `write`
- Mutation-capable: Yes
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`, `MAX_ENTITY_NAME_LENGTH`
- Runtime guards: `ACTUAL_MCP_READ_ONLY`
- Synchronization: `write-and-sync`
- Partial failure: `sync-after-write`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/write.integration.test.ts` — runs the guarded real payee create, read, rename, preflight, and delete lifecycle
- Compiled stdio E2E evidence: `test/e2e/write.e2e.test.ts` — runs a restart-safe payee lifecycle through MCP-only calls

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Ordinary payee to rename and its desired trimmed name.",
  "properties": {
    "name": {
      "maxLength": 255,
      "minLength": 1,
      "type": "string"
    },
    "payeeId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    }
  },
  "required": [
    "payeeId",
    "name"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Persisted payee state after a create or rename operation.",
  "properties": {
    "changed": {
      "description": "Whether this call changed persisted Actual state.",
      "type": "boolean"
    },
    "payee": {
      "additionalProperties": false,
      "description": "One Actual payee with transfer context preserved when supplied by the official API.",
      "properties": {
        "id": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "name": {
          "type": "string"
        },
        "transferAccountId": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "id",
        "name"
      ],
      "type": "object"
    },
    "success": {
      "const": true,
      "type": "boolean"
    }
  },
  "required": [
    "success",
    "changed",
    "payee"
  ],
  "type": "object"
}
```

</details>

## `actual_update_rule`

- Title: Update Actual rule
- Domain: `rules`
- Description: Apply allowlisted desired-state changes to one MCP-writable rule using the official full-object update.
- Capability: `write`
- Mutation-capable: Yes
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`, `MAX_ENTITY_NAME_LENGTH`, `MAX_TEXT_LENGTH`, `MAX_RULE_CONDITIONS`, `MAX_RULE_ACTIONS`, `MAX_RULE_LIST_VALUES`
- Runtime guards: `ACTUAL_MCP_READ_ONLY`
- Synchronization: `write-and-sync`
- Partial failure: `sync-after-write`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/write.integration.test.ts` — persists, updates, functionally executes, and deletes a uniquely owned rule
- Compiled stdio E2E evidence: `test/e2e/write.e2e.test.ts` — creates, updates, functionally executes, and deletes a rule using only MCP tool calls

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Rule identifier and one or more allowlisted desired-state changes.",
  "properties": {
    "actions": {
      "items": {
        "anyOf": [
          {
            "anyOf": [
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "category",
                    "type": "string"
                  },
                  "op": {
                    "const": "set",
                    "type": "string"
                  },
                  "value": {
                    "maxLength": 512,
                    "minLength": 1,
                    "type": "string"
                  }
                },
                "required": [
                  "op",
                  "field",
                  "value"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "payee",
                    "type": "string"
                  },
                  "op": {
                    "const": "set",
                    "type": "string"
                  },
                  "value": {
                    "maxLength": 512,
                    "minLength": 1,
                    "type": "string"
                  }
                },
                "required": [
                  "op",
                  "field",
                  "value"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "account",
                    "type": "string"
                  },
                  "op": {
                    "const": "set",
                    "type": "string"
                  },
                  "value": {
                    "maxLength": 512,
                    "minLength": 1,
                    "type": "string"
                  }
                },
                "required": [
                  "op",
                  "field",
                  "value"
                ],
                "type": "object"
              }
            ]
          },
          {
            "additionalProperties": false,
            "properties": {
              "field": {
                "const": "notes",
                "type": "string"
              },
              "op": {
                "const": "set",
                "type": "string"
              },
              "value": {
                "maxLength": 10000,
                "type": "string"
              }
            },
            "required": [
              "op",
              "field",
              "value"
            ],
            "type": "object"
          },
          {
            "additionalProperties": false,
            "properties": {
              "field": {
                "const": "cleared",
                "type": "string"
              },
              "op": {
                "const": "set",
                "type": "string"
              },
              "value": {
                "type": "boolean"
              }
            },
            "required": [
              "op",
              "field",
              "value"
            ],
            "type": "object"
          },
          {
            "additionalProperties": false,
            "properties": {
              "field": {
                "const": "date",
                "type": "string"
              },
              "op": {
                "const": "set",
                "type": "string"
              },
              "value": {
                "type": "string"
              }
            },
            "required": [
              "op",
              "field",
              "value"
            ],
            "type": "object"
          },
          {
            "additionalProperties": false,
            "properties": {
              "field": {
                "const": "amount",
                "type": "string"
              },
              "op": {
                "const": "set",
                "type": "string"
              },
              "value": {
                "maximum": 9007199254740991,
                "minimum": -9007199254740991,
                "type": "integer"
              }
            },
            "required": [
              "op",
              "field",
              "value"
            ],
            "type": "object"
          },
          {
            "additionalProperties": false,
            "properties": {
              "op": {
                "const": "prepend-notes",
                "type": "string"
              },
              "value": {
                "maxLength": 10000,
                "type": "string"
              }
            },
            "required": [
              "op",
              "value"
            ],
            "type": "object"
          },
          {
            "additionalProperties": false,
            "properties": {
              "op": {
                "const": "append-notes",
                "type": "string"
              },
              "value": {
                "maxLength": 10000,
                "type": "string"
              }
            },
            "required": [
              "op",
              "value"
            ],
            "type": "object"
          }
        ],
        "description": "One supported non-destructive rule action."
      },
      "maxItems": 100,
      "minItems": 1,
      "type": "array"
    },
    "conditions": {
      "items": {
        "anyOf": [
          {
            "anyOf": [
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "account",
                    "type": "string"
                  },
                  "op": {
                    "enum": [
                      "is",
                      "isNot",
                      "contains",
                      "doesNotContain",
                      "matches"
                    ],
                    "type": "string"
                  },
                  "value": {
                    "maxLength": 512,
                    "minLength": 1,
                    "type": "string"
                  }
                },
                "required": [
                  "field",
                  "op",
                  "value"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "account",
                    "type": "string"
                  },
                  "op": {
                    "enum": [
                      "oneOf",
                      "notOneOf"
                    ],
                    "type": "string"
                  },
                  "value": {
                    "items": {
                      "maxLength": 512,
                      "minLength": 1,
                      "type": "string"
                    },
                    "maxItems": 250,
                    "minItems": 1,
                    "type": "array"
                  }
                },
                "required": [
                  "field",
                  "op",
                  "value"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "account",
                    "type": "string"
                  },
                  "op": {
                    "enum": [
                      "onBudget",
                      "offBudget"
                    ],
                    "type": "string"
                  },
                  "value": {
                    "maxLength": 512,
                    "minLength": 1,
                    "type": "string"
                  }
                },
                "required": [
                  "field",
                  "op",
                  "value"
                ],
                "type": "object"
              }
            ]
          },
          {
            "anyOf": [
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "category",
                    "type": "string"
                  },
                  "op": {
                    "enum": [
                      "is",
                      "isNot",
                      "contains",
                      "doesNotContain",
                      "matches"
                    ],
                    "type": "string"
                  },
                  "value": {
                    "maxLength": 512,
                    "minLength": 1,
                    "type": "string"
                  }
                },
                "required": [
                  "field",
                  "op",
                  "value"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "category",
                    "type": "string"
                  },
                  "op": {
                    "enum": [
                      "oneOf",
                      "notOneOf"
                    ],
                    "type": "string"
                  },
                  "value": {
                    "items": {
                      "maxLength": 512,
                      "minLength": 1,
                      "type": "string"
                    },
                    "maxItems": 250,
                    "minItems": 1,
                    "type": "array"
                  }
                },
                "required": [
                  "field",
                  "op",
                  "value"
                ],
                "type": "object"
              }
            ]
          },
          {
            "anyOf": [
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "category_group",
                    "type": "string"
                  },
                  "op": {
                    "enum": [
                      "is",
                      "isNot",
                      "contains",
                      "doesNotContain",
                      "matches"
                    ],
                    "type": "string"
                  },
                  "value": {
                    "maxLength": 512,
                    "minLength": 1,
                    "type": "string"
                  }
                },
                "required": [
                  "field",
                  "op",
                  "value"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "category_group",
                    "type": "string"
                  },
                  "op": {
                    "enum": [
                      "oneOf",
                      "notOneOf"
                    ],
                    "type": "string"
                  },
                  "value": {
                    "items": {
                      "maxLength": 512,
                      "minLength": 1,
                      "type": "string"
                    },
                    "maxItems": 250,
                    "minItems": 1,
                    "type": "array"
                  }
                },
                "required": [
                  "field",
                  "op",
                  "value"
                ],
                "type": "object"
              }
            ]
          },
          {
            "anyOf": [
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "payee",
                    "type": "string"
                  },
                  "op": {
                    "enum": [
                      "is",
                      "isNot",
                      "contains",
                      "doesNotContain",
                      "matches"
                    ],
                    "type": "string"
                  },
                  "value": {
                    "maxLength": 512,
                    "minLength": 1,
                    "type": "string"
                  }
                },
                "required": [
                  "field",
                  "op",
                  "value"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "payee",
                    "type": "string"
                  },
                  "op": {
                    "enum": [
                      "oneOf",
                      "notOneOf"
                    ],
                    "type": "string"
                  },
                  "value": {
                    "items": {
                      "maxLength": 512,
                      "minLength": 1,
                      "type": "string"
                    },
                    "maxItems": 250,
                    "minItems": 1,
                    "type": "array"
                  }
                },
                "required": [
                  "field",
                  "op",
                  "value"
                ],
                "type": "object"
              }
            ]
          },
          {
            "anyOf": [
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "imported_payee",
                    "type": "string"
                  },
                  "op": {
                    "enum": [
                      "is",
                      "isNot",
                      "contains",
                      "doesNotContain",
                      "matches"
                    ],
                    "type": "string"
                  },
                  "value": {
                    "maxLength": 10000,
                    "minLength": 1,
                    "type": "string"
                  }
                },
                "required": [
                  "field",
                  "op",
                  "value"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "imported_payee",
                    "type": "string"
                  },
                  "op": {
                    "enum": [
                      "oneOf",
                      "notOneOf"
                    ],
                    "type": "string"
                  },
                  "value": {
                    "items": {
                      "maxLength": 10000,
                      "minLength": 1,
                      "type": "string"
                    },
                    "maxItems": 250,
                    "minItems": 1,
                    "type": "array"
                  }
                },
                "required": [
                  "field",
                  "op",
                  "value"
                ],
                "type": "object"
              }
            ]
          },
          {
            "additionalProperties": false,
            "properties": {
              "field": {
                "const": "notes",
                "type": "string"
              },
              "op": {
                "enum": [
                  "is",
                  "isNot",
                  "contains",
                  "doesNotContain",
                  "matches",
                  "hasTags",
                  "hasAnyTag"
                ],
                "type": "string"
              },
              "value": {
                "maxLength": 10000,
                "minLength": 1,
                "type": "string"
              }
            },
            "required": [
              "field",
              "op",
              "value"
            ],
            "type": "object"
          },
          {
            "anyOf": [
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "amount",
                    "type": "string"
                  },
                  "op": {
                    "enum": [
                      "is",
                      "isapprox",
                      "gt",
                      "gte",
                      "lt",
                      "lte"
                    ],
                    "type": "string"
                  },
                  "options": {
                    "additionalProperties": false,
                    "properties": {
                      "inflow": {
                        "type": "boolean"
                      },
                      "outflow": {
                        "type": "boolean"
                      }
                    },
                    "type": "object"
                  },
                  "value": {
                    "maximum": 9007199254740991,
                    "minimum": -9007199254740991,
                    "type": "integer"
                  }
                },
                "required": [
                  "field",
                  "op",
                  "value"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "amount",
                    "type": "string"
                  },
                  "op": {
                    "const": "isbetween",
                    "type": "string"
                  },
                  "options": {
                    "additionalProperties": false,
                    "properties": {
                      "inflow": {
                        "type": "boolean"
                      },
                      "outflow": {
                        "type": "boolean"
                      }
                    },
                    "type": "object"
                  },
                  "value": {
                    "additionalProperties": false,
                    "properties": {
                      "num1": {
                        "maximum": 9007199254740991,
                        "minimum": -9007199254740991,
                        "type": "integer"
                      },
                      "num2": {
                        "maximum": 9007199254740991,
                        "minimum": -9007199254740991,
                        "type": "integer"
                      }
                    },
                    "required": [
                      "num1",
                      "num2"
                    ],
                    "type": "object"
                  }
                },
                "required": [
                  "field",
                  "op",
                  "value"
                ],
                "type": "object"
              }
            ]
          },
          {
            "additionalProperties": false,
            "properties": {
              "field": {
                "const": "date",
                "type": "string"
              },
              "op": {
                "enum": [
                  "is",
                  "isapprox",
                  "gt",
                  "gte",
                  "lt",
                  "lte"
                ],
                "type": "string"
              },
              "options": {
                "additionalProperties": false,
                "properties": {
                  "month": {
                    "type": "boolean"
                  },
                  "year": {
                    "type": "boolean"
                  }
                },
                "type": "object"
              },
              "value": {
                "type": "string"
              }
            },
            "required": [
              "field",
              "op",
              "value"
            ],
            "type": "object"
          },
          {
            "additionalProperties": false,
            "properties": {
              "field": {
                "const": "saved",
                "type": "string"
              },
              "op": {
                "const": "is",
                "type": "string"
              },
              "value": {
                "maxLength": 10000,
                "type": "string"
              }
            },
            "required": [
              "field",
              "op",
              "value"
            ],
            "type": "object"
          },
          {
            "anyOf": [
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "cleared",
                    "type": "string"
                  },
                  "op": {
                    "const": "is",
                    "type": "string"
                  },
                  "value": {
                    "type": "boolean"
                  }
                },
                "required": [
                  "field",
                  "op",
                  "value"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "reconciled",
                    "type": "string"
                  },
                  "op": {
                    "const": "is",
                    "type": "string"
                  },
                  "value": {
                    "type": "boolean"
                  }
                },
                "required": [
                  "field",
                  "op",
                  "value"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "transfer",
                    "type": "string"
                  },
                  "op": {
                    "const": "is",
                    "type": "string"
                  },
                  "value": {
                    "type": "boolean"
                  }
                },
                "required": [
                  "field",
                  "op",
                  "value"
                ],
                "type": "object"
              }
            ]
          }
        ],
        "description": "One supported field/operator/value rule condition."
      },
      "maxItems": 100,
      "minItems": 1,
      "type": "array"
    },
    "conditionsOp": {
      "enum": [
        "and",
        "or"
      ],
      "type": "string"
    },
    "ruleId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    },
    "stage": {
      "enum": [
        "pre",
        "default",
        "post"
      ],
      "type": "string"
    }
  },
  "required": [
    "ruleId"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Persisted normalized rule after creation or desired-state update.",
  "properties": {
    "changed": {
      "description": "Whether this call changed persisted Actual state.",
      "type": "boolean"
    },
    "rule": {
      "additionalProperties": false,
      "description": "Complete normalized rule with MCP writability classification.",
      "properties": {
        "actions": {
          "items": {
            "anyOf": [
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "type": "string"
                  },
                  "op": {
                    "const": "set",
                    "type": "string"
                  },
                  "options": {
                    "anyOf": [
                      {
                        "additionalProperties": false,
                        "properties": {
                          "formula": {
                            "type": "string"
                          },
                          "splitIndex": {
                            "maximum": 9007199254740991,
                            "minimum": -9007199254740991,
                            "type": "integer"
                          },
                          "template": {
                            "type": "string"
                          }
                        },
                        "type": "object"
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "type": {
                    "type": "string"
                  },
                  "value": {}
                },
                "required": [
                  "op",
                  "field",
                  "value"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "type": "null"
                  },
                  "op": {
                    "const": "set-split-amount",
                    "type": "string"
                  },
                  "options": {
                    "anyOf": [
                      {
                        "additionalProperties": false,
                        "properties": {
                          "formula": {
                            "type": "string"
                          },
                          "method": {
                            "enum": [
                              "fixed-amount",
                              "fixed-percent",
                              "formula",
                              "remainder"
                            ],
                            "type": "string"
                          },
                          "splitIndex": {
                            "maximum": 9007199254740991,
                            "minimum": -9007199254740991,
                            "type": "integer"
                          }
                        },
                        "required": [
                          "method"
                        ],
                        "type": "object"
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "type": {
                    "type": "string"
                  },
                  "value": {
                    "anyOf": [
                      {
                        "maximum": 9007199254740991,
                        "minimum": -9007199254740991,
                        "type": "integer"
                      },
                      {
                        "type": "null"
                      }
                    ]
                  }
                },
                "required": [
                  "op",
                  "value"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "type": "null"
                  },
                  "op": {
                    "const": "link-schedule",
                    "type": "string"
                  },
                  "type": {
                    "type": "string"
                  },
                  "value": {
                    "maxLength": 512,
                    "minLength": 1,
                    "type": "string"
                  }
                },
                "required": [
                  "op",
                  "value"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "notes",
                    "type": "string"
                  },
                  "op": {
                    "const": "prepend-notes",
                    "type": "string"
                  },
                  "type": {
                    "type": "string"
                  },
                  "value": {
                    "type": "string"
                  }
                },
                "required": [
                  "op",
                  "value"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "const": "notes",
                    "type": "string"
                  },
                  "op": {
                    "const": "append-notes",
                    "type": "string"
                  },
                  "type": {
                    "type": "string"
                  },
                  "value": {
                    "type": "string"
                  }
                },
                "required": [
                  "op",
                  "value"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "type": "null"
                  },
                  "op": {
                    "const": "delete-transaction",
                    "type": "string"
                  },
                  "type": {
                    "type": "string"
                  },
                  "value": {
                    "type": "string"
                  }
                },
                "required": [
                  "op",
                  "value"
                ],
                "type": "object"
              }
            ]
          },
          "type": "array"
        },
        "conditions": {
          "items": {
            "additionalProperties": false,
            "properties": {
              "conditionsOp": {
                "enum": [
                  "and",
                  "or"
                ],
                "type": "string"
              },
              "customName": {
                "type": "string"
              },
              "field": {
                "enum": [
                  "account",
                  "category",
                  "category_group",
                  "amount",
                  "date",
                  "notes",
                  "payee",
                  "imported_payee",
                  "saved",
                  "cleared",
                  "reconciled",
                  "transfer"
                ],
                "type": "string"
              },
              "op": {
                "enum": [
                  "is",
                  "isNot",
                  "oneOf",
                  "notOneOf",
                  "contains",
                  "doesNotContain",
                  "matches",
                  "onBudget",
                  "offBudget",
                  "isapprox",
                  "isbetween",
                  "gt",
                  "gte",
                  "lt",
                  "lte",
                  "hasTags",
                  "hasAnyTag"
                ],
                "type": "string"
              },
              "options": {
                "anyOf": [
                  {
                    "additionalProperties": false,
                    "properties": {
                      "inflow": {
                        "type": "boolean"
                      },
                      "month": {
                        "type": "boolean"
                      },
                      "outflow": {
                        "type": "boolean"
                      },
                      "year": {
                        "type": "boolean"
                      }
                    },
                    "type": "object"
                  },
                  {
                    "type": "null"
                  }
                ]
              },
              "queryFilter": {
                "additionalProperties": {
                  "additionalProperties": false,
                  "properties": {
                    "$oneof": {
                      "items": {
                        "type": "string"
                      },
                      "type": "array"
                    }
                  },
                  "required": [
                    "$oneof"
                  ],
                  "type": "object"
                },
                "propertyNames": {
                  "type": "string"
                },
                "type": "object"
              },
              "type": {
                "enum": [
                  "id",
                  "boolean",
                  "date",
                  "number",
                  "string"
                ],
                "type": "string"
              },
              "value": {}
            },
            "required": [
              "field",
              "op",
              "value"
            ],
            "type": "object"
          },
          "type": "array"
        },
        "conditionsOp": {
          "enum": [
            "and",
            "or"
          ],
          "type": "string"
        },
        "id": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "stage": {
          "enum": [
            "pre",
            "default",
            "post"
          ],
          "type": "string"
        },
        "writable": {
          "type": "boolean"
        },
        "writeRestriction": {
          "type": "string"
        }
      },
      "required": [
        "id",
        "stage",
        "conditionsOp",
        "conditions",
        "actions",
        "writable"
      ],
      "type": "object"
    },
    "success": {
      "const": true,
      "type": "boolean"
    }
  },
  "required": [
    "success",
    "changed",
    "rule"
  ],
  "type": "object"
}
```

</details>

## `actual_update_schedule`

- Title: Update Actual schedule
- Domain: `schedules`
- Description: Apply a non-empty allowlisted desired-state update and verify the persisted schedule.
- Capability: `write`
- Mutation-capable: Yes
- Destructive: No
- Idempotent: Yes
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`, `MAX_ENTITY_NAME_LENGTH`, `MAX_TEXT_LENGTH`, `MAX_SCHEDULE_PATTERNS`
- Runtime guards: `ACTUAL_MCP_READ_ONLY`
- Synchronization: `write-and-sync`
- Partial failure: `sync-after-write`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/write.integration.test.ts` — creates, lists, gets, updates, guards, and deletes an isolated schedule
- Compiled stdio E2E evidence: `test/e2e/write.e2e.test.ts` — runs an isolated schedule lifecycle and destructive kill-switch check through compiled stdio

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Non-empty supported schedule update.",
  "properties": {
    "accountId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    },
    "amount": {
      "oneOf": [
        {
          "additionalProperties": false,
          "properties": {
            "amount": {
              "maximum": 9007199254740991,
              "minimum": -9007199254740991,
              "type": "integer"
            },
            "type": {
              "const": "exact",
              "type": "string"
            }
          },
          "required": [
            "type",
            "amount"
          ],
          "type": "object"
        },
        {
          "additionalProperties": false,
          "properties": {
            "amount": {
              "maximum": 9007199254740991,
              "minimum": -9007199254740991,
              "type": "integer"
            },
            "type": {
              "const": "approximate",
              "type": "string"
            }
          },
          "required": [
            "type",
            "amount"
          ],
          "type": "object"
        },
        {
          "additionalProperties": false,
          "properties": {
            "maxAmount": {
              "maximum": 9007199254740991,
              "minimum": -9007199254740991,
              "type": "integer"
            },
            "minAmount": {
              "maximum": 9007199254740991,
              "minimum": -9007199254740991,
              "type": "integer"
            },
            "type": {
              "const": "between",
              "type": "string"
            }
          },
          "required": [
            "type",
            "minAmount",
            "maxAmount"
          ],
          "type": "object"
        }
      ]
    },
    "date": {
      "oneOf": [
        {
          "additionalProperties": false,
          "properties": {
            "date": {
              "type": "string"
            },
            "type": {
              "const": "oneTime",
              "type": "string"
            }
          },
          "required": [
            "type",
            "date"
          ],
          "type": "object"
        },
        {
          "additionalProperties": false,
          "properties": {
            "end": {
              "default": {
                "type": "never"
              },
              "oneOf": [
                {
                  "additionalProperties": false,
                  "properties": {
                    "type": {
                      "const": "never",
                      "type": "string"
                    }
                  },
                  "required": [
                    "type"
                  ],
                  "type": "object"
                },
                {
                  "additionalProperties": false,
                  "properties": {
                    "occurrences": {
                      "exclusiveMinimum": 0,
                      "maximum": 9007199254740991,
                      "type": "integer"
                    },
                    "type": {
                      "const": "afterOccurrences",
                      "type": "string"
                    }
                  },
                  "required": [
                    "type",
                    "occurrences"
                  ],
                  "type": "object"
                },
                {
                  "additionalProperties": false,
                  "properties": {
                    "date": {
                      "type": "string"
                    },
                    "type": {
                      "const": "onDate",
                      "type": "string"
                    }
                  },
                  "required": [
                    "type",
                    "date"
                  ],
                  "type": "object"
                }
              ]
            },
            "frequency": {
              "enum": [
                "daily",
                "weekly",
                "monthly",
                "yearly"
              ],
              "type": "string"
            },
            "interval": {
              "exclusiveMinimum": 0,
              "maximum": 9007199254740991,
              "type": "integer"
            },
            "patterns": {
              "items": {
                "additionalProperties": false,
                "properties": {
                  "type": {
                    "enum": [
                      "day",
                      "SU",
                      "MO",
                      "TU",
                      "WE",
                      "TH",
                      "FR",
                      "SA"
                    ],
                    "type": "string"
                  },
                  "value": {
                    "maximum": 9007199254740991,
                    "minimum": -9007199254740991,
                    "type": "integer"
                  }
                },
                "required": [
                  "type",
                  "value"
                ],
                "type": "object"
              },
              "maxItems": 31,
              "minItems": 1,
              "type": "array"
            },
            "start": {
              "type": "string"
            },
            "type": {
              "const": "recurring",
              "type": "string"
            },
            "weekend": {
              "default": "none",
              "enum": [
                "none",
                "before",
                "after"
              ],
              "type": "string"
            }
          },
          "required": [
            "type",
            "frequency",
            "start",
            "interval"
          ],
          "type": "object"
        }
      ]
    },
    "name": {
      "maxLength": 255,
      "minLength": 1,
      "type": "string"
    },
    "payeeId": {
      "anyOf": [
        {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        {
          "type": "null"
        }
      ]
    },
    "postsTransaction": {
      "type": "boolean"
    },
    "scheduleId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    }
  },
  "required": [
    "scheduleId"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Verified schedule mutation result.",
  "properties": {
    "changed": {
      "type": "boolean"
    },
    "changedFields": {
      "items": {
        "type": "string"
      },
      "type": "array"
    },
    "schedule": {
      "additionalProperties": false,
      "description": "Stable schedule projection without protected rule internals.",
      "properties": {
        "accountId": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "amount": {
          "anyOf": [
            {
              "oneOf": [
                {
                  "additionalProperties": false,
                  "properties": {
                    "amount": {
                      "maximum": 9007199254740991,
                      "minimum": -9007199254740991,
                      "type": "integer"
                    },
                    "type": {
                      "const": "exact",
                      "type": "string"
                    }
                  },
                  "required": [
                    "type",
                    "amount"
                  ],
                  "type": "object"
                },
                {
                  "additionalProperties": false,
                  "properties": {
                    "amount": {
                      "maximum": 9007199254740991,
                      "minimum": -9007199254740991,
                      "type": "integer"
                    },
                    "type": {
                      "const": "approximate",
                      "type": "string"
                    }
                  },
                  "required": [
                    "type",
                    "amount"
                  ],
                  "type": "object"
                },
                {
                  "additionalProperties": false,
                  "properties": {
                    "maxAmount": {
                      "maximum": 9007199254740991,
                      "minimum": -9007199254740991,
                      "type": "integer"
                    },
                    "minAmount": {
                      "maximum": 9007199254740991,
                      "minimum": -9007199254740991,
                      "type": "integer"
                    },
                    "type": {
                      "const": "between",
                      "type": "string"
                    }
                  },
                  "required": [
                    "type",
                    "minAmount",
                    "maxAmount"
                  ],
                  "type": "object"
                }
              ]
            },
            {
              "type": "null"
            }
          ]
        },
        "completed": {
          "type": "boolean"
        },
        "date": {
          "anyOf": [
            {
              "oneOf": [
                {
                  "additionalProperties": false,
                  "properties": {
                    "date": {
                      "type": "string"
                    },
                    "type": {
                      "const": "oneTime",
                      "type": "string"
                    }
                  },
                  "required": [
                    "type",
                    "date"
                  ],
                  "type": "object"
                },
                {
                  "additionalProperties": false,
                  "properties": {
                    "end": {
                      "default": {
                        "type": "never"
                      },
                      "oneOf": [
                        {
                          "additionalProperties": false,
                          "properties": {
                            "type": {
                              "const": "never",
                              "type": "string"
                            }
                          },
                          "required": [
                            "type"
                          ],
                          "type": "object"
                        },
                        {
                          "additionalProperties": false,
                          "properties": {
                            "occurrences": {
                              "exclusiveMinimum": 0,
                              "maximum": 9007199254740991,
                              "type": "integer"
                            },
                            "type": {
                              "const": "afterOccurrences",
                              "type": "string"
                            }
                          },
                          "required": [
                            "type",
                            "occurrences"
                          ],
                          "type": "object"
                        },
                        {
                          "additionalProperties": false,
                          "properties": {
                            "date": {
                              "type": "string"
                            },
                            "type": {
                              "const": "onDate",
                              "type": "string"
                            }
                          },
                          "required": [
                            "type",
                            "date"
                          ],
                          "type": "object"
                        }
                      ]
                    },
                    "frequency": {
                      "enum": [
                        "daily",
                        "weekly",
                        "monthly",
                        "yearly"
                      ],
                      "type": "string"
                    },
                    "interval": {
                      "exclusiveMinimum": 0,
                      "maximum": 9007199254740991,
                      "type": "integer"
                    },
                    "patterns": {
                      "items": {
                        "additionalProperties": false,
                        "properties": {
                          "type": {
                            "enum": [
                              "day",
                              "SU",
                              "MO",
                              "TU",
                              "WE",
                              "TH",
                              "FR",
                              "SA"
                            ],
                            "type": "string"
                          },
                          "value": {
                            "maximum": 9007199254740991,
                            "minimum": -9007199254740991,
                            "type": "integer"
                          }
                        },
                        "required": [
                          "type",
                          "value"
                        ],
                        "type": "object"
                      },
                      "minItems": 1,
                      "type": "array"
                    },
                    "start": {
                      "type": "string"
                    },
                    "type": {
                      "const": "recurring",
                      "type": "string"
                    },
                    "weekend": {
                      "default": "none",
                      "enum": [
                        "none",
                        "before",
                        "after"
                      ],
                      "type": "string"
                    }
                  },
                  "required": [
                    "type",
                    "frequency",
                    "start",
                    "interval",
                    "weekend",
                    "end"
                  ],
                  "type": "object"
                }
              ]
            },
            {
              "type": "null"
            }
          ]
        },
        "id": {
          "maxLength": 512,
          "minLength": 1,
          "type": "string"
        },
        "name": {
          "type": "string"
        },
        "nextDate": {
          "type": "string"
        },
        "payeeId": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "postsTransaction": {
          "type": "boolean"
        },
        "unsupportedReasons": {
          "items": {
            "type": "string"
          },
          "type": "array"
        },
        "writable": {
          "type": "boolean"
        }
      },
      "required": [
        "id",
        "accountId",
        "payeeId",
        "amount",
        "date",
        "completed",
        "postsTransaction",
        "writable",
        "unsupportedReasons"
      ],
      "type": "object"
    },
    "success": {
      "const": true,
      "type": "boolean"
    }
  },
  "required": [
    "success",
    "changed",
    "schedule"
  ],
  "type": "object"
}
```

</details>

## `actual_update_transaction`

- Title: Update Actual transaction
- Domain: `transactions`
- Description: Update only the permitted fields of one Actual transaction, then synchronize.
- Capability: `write`
- Mutation-capable: Yes
- Destructive: No
- Idempotent: No
- Confirmation: `none`
- Bounds: `MAX_ID_LENGTH`, `MAX_ENTITY_NAME_LENGTH`, `MAX_TEXT_LENGTH`
- Runtime guards: `ACTUAL_MCP_READ_ONLY`
- Synchronization: `write-and-sync`
- Partial failure: `sync-after-write`
- Unit evidence: `test/mcp.test.ts` — executes every handler successfully with structured and JSON text results
- Contract evidence: `test/contract/current-contract.test.ts` — matches every current tool against the frozen v0.7.0 contract
- Integration evidence: `test/integration/write.integration.test.ts` — updates only the transaction created by this run and persists notes
- Compiled stdio E2E evidence: `test/e2e/write.e2e.test.ts` — updates, explicitly syncs, and reads the persisted change through MCP

<details>
<summary>Input schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Target transaction and allowlisted partial update.",
  "properties": {
    "fields": {
      "additionalProperties": false,
      "description": "One or more allowlisted transaction fields.",
      "properties": {
        "amount": {
          "maximum": 9007199254740991,
          "minimum": -9007199254740991,
          "type": "integer"
        },
        "category": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "cleared": {
          "type": "boolean"
        },
        "date": {
          "type": "string"
        },
        "notes": {
          "anyOf": [
            {
              "maxLength": 10000,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "payee": {
          "anyOf": [
            {
              "maxLength": 512,
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "type": "object"
    },
    "transactionId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    }
  },
  "required": [
    "transactionId",
    "fields"
  ],
  "type": "object"
}
```

</details>

<details>
<summary>Output schema</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Successful synchronized transaction mutation.",
  "properties": {
    "affectedTransactionIds": {
      "items": {
        "maxLength": 512,
        "minLength": 1,
        "type": "string"
      },
      "type": "array"
    },
    "counterpartTransactionId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    },
    "deletedTransferPair": {
      "type": "boolean"
    },
    "linkedTransferAffected": {
      "type": "boolean"
    },
    "mirroredFields": {
      "items": {
        "enum": [
          "category",
          "payee",
          "notes",
          "cleared",
          "date",
          "amount"
        ],
        "type": "string"
      },
      "type": "array"
    },
    "success": {
      "const": true,
      "type": "boolean"
    },
    "transactionId": {
      "maxLength": 512,
      "minLength": 1,
      "type": "string"
    },
    "verified": {
      "type": "boolean"
    }
  },
  "required": [
    "success",
    "transactionId"
  ],
  "type": "object"
}
```

</details>
