/**
 * Delegation contract ABI subset for the EVM implementation.
 */
export const delegationAbi = [
  {
    name: "getDelegations",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "id", type: "bytes32" },
          { name: "delegator", type: "address" },
          { name: "delegatee", type: "address" },
          { name: "permissions", type: "bytes32[]" },
          { name: "createdAt", type: "uint256" },
          { name: "expiresAt", type: "uint256" },
          { name: "active", type: "bool" },
        ],
      },
    ],
  },
  {
    name: "getDelegation",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "delegationId", type: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "bytes32" },
          { name: "delegator", type: "address" },
          { name: "delegatee", type: "address" },
          { name: "permissions", type: "bytes32[]" },
          { name: "createdAt", type: "uint256" },
          { name: "expiresAt", type: "uint256" },
          { name: "active", type: "bool" },
        ],
      },
    ],
  },
  {
    name: "createDelegation",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "delegatee", type: "address" },
      { name: "permissions", type: "bytes32[]" },
      { name: "expiresAt", type: "uint256" },
    ],
    outputs: [{ name: "delegationId", type: "bytes32" }],
  },
  {
    name: "revokeDelegation",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "delegationId", type: "bytes32" }],
    outputs: [],
  },
  {
    name: "batchRevoke",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "delegationIds", type: "bytes32[]" }],
    outputs: [],
  },
  {
    name: "isActive",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "delegationId", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;
