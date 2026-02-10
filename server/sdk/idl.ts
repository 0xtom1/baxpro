export type NftLending = {
  version: "0.1.0";
  name: "nft_lending";
  instructions: [
    {
      name: "initializeLendingPool";
      discriminator: [236, 76, 136, 68, 196, 14, 9, 177];
      accounts: [
        { name: "lendingPool"; writable: true },
        { name: "authority"; writable: true; signer: true },
        { name: "systemProgram" }
      ];
      args: [
        { name: "feeWallet"; type: "pubkey" },
        { name: "feeBps"; type: "u16" }
      ];
    },
    {
      name: "createLoan";
      discriminator: [166, 131, 118, 219, 138, 218, 206, 140];
      accounts: [
        { name: "loan"; writable: true },
        { name: "borrower"; writable: true; signer: true },
        { name: "systemProgram" }
      ];
      args: [
        { name: "loanId"; type: "u64" },
        { name: "loanAmount"; type: "u64" },
        { name: "interestRateBps"; type: "u16" },
        { name: "durationSeconds"; type: "i64" }
      ];
    },
    {
      name: "addCollateral";
      discriminator: [127, 82, 121, 42, 161, 176, 249, 206];
      accounts: [
        { name: "loan"; writable: true },
        { name: "nftMint" },
        { name: "borrowerNftAccount"; writable: true },
        { name: "nftEscrow"; writable: true },
        { name: "borrower"; writable: true; signer: true },
        { name: "tokenProgram" },
        { name: "systemProgram" }
      ];
      args: [];
    },
    {
      name: "activateListing";
      discriminator: [186, 120, 180, 124, 2, 197, 186, 231];
      accounts: [
        { name: "lendingPool"; writable: true },
        { name: "loan"; writable: true },
        { name: "borrower"; signer: true }
      ];
      args: [];
    },
    {
      name: "fundLoan";
      discriminator: [50, 221, 51, 13, 3, 142, 116, 215];
      accounts: [
        { name: "lendingPool"; writable: true },
        { name: "loan"; writable: true },
        { name: "borrower"; writable: true },
        { name: "lender"; writable: true; signer: true },
        { name: "systemProgram" }
      ];
      args: [];
    },
    {
      name: "repayLoan";
      discriminator: [224, 93, 144, 77, 61, 17, 137, 54];
      accounts: [
        { name: "lendingPool"; writable: true },
        { name: "loan"; writable: true },
        { name: "borrower"; writable: true; signer: true },
        { name: "lender"; writable: true },
        { name: "feeWallet"; writable: true },
        { name: "tokenProgram" },
        { name: "systemProgram" }
      ];
      args: [];
    },
    {
      name: "liquidateLoan";
      discriminator: [111, 249, 185, 54, 161, 147, 178, 24];
      accounts: [
        { name: "lendingPool"; writable: true },
        { name: "loan"; writable: true },
        { name: "lender"; writable: true; signer: true },
        { name: "tokenProgram" },
        { name: "systemProgram" }
      ];
      args: [];
    },
    {
      name: "cancelListing";
      discriminator: [41, 183, 50, 232, 230, 233, 157, 70];
      accounts: [
        { name: "loan"; writable: true },
        { name: "borrower"; writable: true; signer: true },
        { name: "tokenProgram" },
        { name: "systemProgram" }
      ];
      args: [];
    }
  ];
  accounts: [
    { name: "lendingPool"; discriminator: [208, 40, 242, 82, 186, 18, 75, 36] },
    { name: "loan"; discriminator: [20, 195, 70, 117, 165, 227, 182, 1] }
  ];
  types: [
    {
      name: "lendingPool";
      type: {
        kind: "struct";
        fields: [
          { name: "authority"; type: "pubkey" },
          { name: "nftVault"; type: "pubkey" },
          { name: "feeWallet"; type: "pubkey" },
          { name: "feeBps"; type: "u16" },
          { name: "totalLoansCreated"; type: "u64" },
          { name: "totalLoansFunded"; type: "u64" },
          { name: "totalLoansRepaid"; type: "u64" },
          { name: "totalLoansLiquidated"; type: "u64" },
          { name: "bump"; type: "u8" }
        ];
      };
    },
    {
      name: "loan";
      type: {
        kind: "struct";
        fields: [
          { name: "borrower"; type: "pubkey" },
          { name: "lender"; type: "pubkey" },
          { name: "loanId"; type: "u64" },
          { name: "nftMints"; type: { array: ["pubkey", 5] } },
          { name: "nftEscrows"; type: { array: ["pubkey", 5] } },
          { name: "collateralCount"; type: "u8" },
          { name: "loanAmount"; type: "u64" },
          { name: "interestRateBps"; type: "u16" },
          { name: "durationSeconds"; type: "i64" },
          { name: "startTime"; type: "i64" },
          { name: "status"; type: { defined: { name: "LoanStatus" } } },
          { name: "bump"; type: "u8" }
        ];
      };
    },
    {
      name: "LoanStatus";
      type: {
        kind: "enum";
        variants: [
          { name: "Draft" },
          { name: "Listed" },
          { name: "Active" },
          { name: "Repaid" },
          { name: "Liquidated" },
          { name: "Cancelled" }
        ];
      };
    }
  ];
  errors: [
    { code: 6000; name: "InvalidLoanState"; msg: "Loan is not in the correct state for this operation" },
    { code: 6001; name: "LoanNotExpired"; msg: "Loan has not yet expired and cannot be liquidated" },
    { code: 6002; name: "InterestRateTooHigh"; msg: "Interest rate exceeds maximum allowed (10000 bps = 100%)" },
    { code: 6003; name: "InvalidDuration"; msg: "Loan duration must be positive" },
    { code: 6004; name: "InvalidLoanAmount"; msg: "Loan amount must be greater than zero" },
    { code: 6005; name: "UnauthorizedBorrower"; msg: "Unauthorized: Only the borrower can perform this action" },
    { code: 6006; name: "UnauthorizedLender"; msg: "Unauthorized: Only the lender can perform this action" },
    { code: 6007; name: "MathOverflow"; msg: "Arithmetic overflow occurred" },
    { code: 6008; name: "InvalidNft"; msg: "Invalid NFT: Must be a Token-2022 NFT with 0 decimals and supply of 1" },
    { code: 6009; name: "TooManyCollateral"; msg: "Maximum collateral count (5) reached" },
    { code: 6010; name: "NoCollateral"; msg: "Loan must have at least one collateral NFT before listing" },
    { code: 6011; name: "InvalidRemainingAccounts"; msg: "Invalid remaining accounts: must provide groups of 3 (mint, escrow, token_account) per collateral" },
    { code: 6012; name: "CollateralMintMismatch"; msg: "Collateral mint does not match loan records" },
    { code: 6013; name: "CollateralEscrowMismatch"; msg: "Collateral escrow does not match loan records" },
    { code: 6014; name: "InvalidFeeWallet"; msg: "Fee wallet does not match the lending pool configuration" }
  ];
};

export const IDL: NftLending = {
  version: "0.1.0",
  name: "nft_lending",
  instructions: [
    {
      name: "initializeLendingPool",
      discriminator: [236, 76, 136, 68, 196, 14, 9, 177],
      accounts: [
        { name: "lendingPool", writable: true },
        { name: "authority", writable: true, signer: true },
        { name: "systemProgram" }
      ],
      args: [
        { name: "feeWallet", type: "pubkey" },
        { name: "feeBps", type: "u16" }
      ]
    },
    {
      name: "createLoan",
      discriminator: [166, 131, 118, 219, 138, 218, 206, 140],
      accounts: [
        { name: "loan", writable: true },
        { name: "borrower", writable: true, signer: true },
        { name: "systemProgram" }
      ],
      args: [
        { name: "loanId", type: "u64" },
        { name: "loanAmount", type: "u64" },
        { name: "interestRateBps", type: "u16" },
        { name: "durationSeconds", type: "i64" }
      ]
    },
    {
      name: "addCollateral",
      discriminator: [127, 82, 121, 42, 161, 176, 249, 206],
      accounts: [
        { name: "loan", writable: true },
        { name: "nftMint" },
        { name: "borrowerNftAccount", writable: true },
        { name: "nftEscrow", writable: true },
        { name: "borrower", writable: true, signer: true },
        { name: "tokenProgram" },
        { name: "systemProgram" }
      ],
      args: []
    },
    {
      name: "activateListing",
      discriminator: [186, 120, 180, 124, 2, 197, 186, 231],
      accounts: [
        { name: "lendingPool", writable: true },
        { name: "loan", writable: true },
        { name: "borrower", signer: true }
      ],
      args: []
    },
    {
      name: "fundLoan",
      discriminator: [50, 221, 51, 13, 3, 142, 116, 215],
      accounts: [
        { name: "lendingPool", writable: true },
        { name: "loan", writable: true },
        { name: "borrower", writable: true },
        { name: "lender", writable: true, signer: true },
        { name: "systemProgram" }
      ],
      args: []
    },
    {
      name: "repayLoan",
      discriminator: [224, 93, 144, 77, 61, 17, 137, 54],
      accounts: [
        { name: "lendingPool", writable: true },
        { name: "loan", writable: true },
        { name: "borrower", writable: true, signer: true },
        { name: "lender", writable: true },
        { name: "feeWallet", writable: true },
        { name: "tokenProgram" },
        { name: "systemProgram" }
      ],
      args: []
    },
    {
      name: "liquidateLoan",
      discriminator: [111, 249, 185, 54, 161, 147, 178, 24],
      accounts: [
        { name: "lendingPool", writable: true },
        { name: "loan", writable: true },
        { name: "lender", writable: true, signer: true },
        { name: "tokenProgram" },
        { name: "systemProgram" }
      ],
      args: []
    },
    {
      name: "cancelListing",
      discriminator: [41, 183, 50, 232, 230, 233, 157, 70],
      accounts: [
        { name: "loan", writable: true },
        { name: "borrower", writable: true, signer: true },
        { name: "tokenProgram" },
        { name: "systemProgram" }
      ],
      args: []
    }
  ],
  accounts: [
    { name: "lendingPool", discriminator: [208, 40, 242, 82, 186, 18, 75, 36] },
    { name: "loan", discriminator: [20, 195, 70, 117, 165, 227, 182, 1] }
  ],
  types: [
    {
      name: "lendingPool",
      type: {
        kind: "struct",
        fields: [
          { name: "authority", type: "pubkey" },
          { name: "nftVault", type: "pubkey" },
          { name: "feeWallet", type: "pubkey" },
          { name: "feeBps", type: "u16" },
          { name: "totalLoansCreated", type: "u64" },
          { name: "totalLoansFunded", type: "u64" },
          { name: "totalLoansRepaid", type: "u64" },
          { name: "totalLoansLiquidated", type: "u64" },
          { name: "bump", type: "u8" }
        ]
      }
    },
    {
      name: "loan",
      type: {
        kind: "struct",
        fields: [
          { name: "borrower", type: "pubkey" },
          { name: "lender", type: "pubkey" },
          { name: "loanId", type: "u64" },
          { name: "nftMints", type: { array: ["pubkey", 5] } },
          { name: "nftEscrows", type: { array: ["pubkey", 5] } },
          { name: "collateralCount", type: "u8" },
          { name: "loanAmount", type: "u64" },
          { name: "interestRateBps", type: "u16" },
          { name: "durationSeconds", type: "i64" },
          { name: "startTime", type: "i64" },
          { name: "status", type: { defined: { name: "LoanStatus" } } },
          { name: "bump", type: "u8" }
        ]
      }
    },
    {
      name: "LoanStatus",
      type: {
        kind: "enum",
        variants: [
          { name: "Draft" },
          { name: "Listed" },
          { name: "Active" },
          { name: "Repaid" },
          { name: "Liquidated" },
          { name: "Cancelled" }
        ]
      }
    }
  ],
  errors: [
    { code: 6000, name: "InvalidLoanState", msg: "Loan is not in the correct state for this operation" },
    { code: 6001, name: "LoanNotExpired", msg: "Loan has not yet expired and cannot be liquidated" },
    { code: 6002, name: "InterestRateTooHigh", msg: "Interest rate exceeds maximum allowed (10000 bps = 100%)" },
    { code: 6003, name: "InvalidDuration", msg: "Loan duration must be positive" },
    { code: 6004, name: "InvalidLoanAmount", msg: "Loan amount must be greater than zero" },
    { code: 6005, name: "UnauthorizedBorrower", msg: "Unauthorized: Only the borrower can perform this action" },
    { code: 6006, name: "UnauthorizedLender", msg: "Unauthorized: Only the lender can perform this action" },
    { code: 6007, name: "MathOverflow", msg: "Arithmetic overflow occurred" },
    { code: 6008, name: "InvalidNft", msg: "Invalid NFT: Must be a Token-2022 NFT with 0 decimals and supply of 1" },
    { code: 6009, name: "TooManyCollateral", msg: "Maximum collateral count (5) reached" },
    { code: 6010, name: "NoCollateral", msg: "Loan must have at least one collateral NFT before listing" },
    { code: 6011, name: "InvalidRemainingAccounts", msg: "Invalid remaining accounts: must provide groups of 3 (mint, escrow, token_account) per collateral" },
    { code: 6012, name: "CollateralMintMismatch", msg: "Collateral mint does not match loan records" },
    { code: 6013, name: "CollateralEscrowMismatch", msg: "Collateral escrow does not match loan records" },
    { code: 6014, name: "InvalidFeeWallet", msg: "Fee wallet does not match the lending pool configuration" }
  ]
};
