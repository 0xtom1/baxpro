export type NftLending = {
  version: "0.1.0";
  name: "nft_lending";
  instructions: [
    {
      name: "initializeLendingPool";
      accounts: [
        { name: "lendingPool"; isMut: true; isSigner: false },
        { name: "authority"; isMut: true; isSigner: true },
        { name: "systemProgram"; isMut: false; isSigner: false }
      ];
      args: [];
    },
    {
      name: "createLoanListing";
      accounts: [
        { name: "lendingPool"; isMut: true; isSigner: false },
        { name: "loan"; isMut: true; isSigner: false },
        { name: "nftMint"; isMut: false; isSigner: false },
        { name: "borrowerNftAccount"; isMut: true; isSigner: false },
        { name: "nftEscrow"; isMut: true; isSigner: false },
        { name: "borrower"; isMut: true; isSigner: true },
        { name: "tokenProgram"; isMut: false; isSigner: false },
        { name: "systemProgram"; isMut: false; isSigner: false }
      ];
      args: [
        { name: "loanAmount"; type: "u64" },
        { name: "interestRateBps"; type: "u16" },
        { name: "durationSeconds"; type: "i64" }
      ];
    },
    {
      name: "fundLoan";
      accounts: [
        { name: "lendingPool"; isMut: true; isSigner: false },
        { name: "loan"; isMut: true; isSigner: false },
        { name: "borrower"; isMut: true; isSigner: false },
        { name: "lender"; isMut: true; isSigner: true },
        { name: "systemProgram"; isMut: false; isSigner: false }
      ];
      args: [];
    },
    {
      name: "repayLoan";
      accounts: [
        { name: "lendingPool"; isMut: true; isSigner: false },
        { name: "loan"; isMut: true; isSigner: false },
        { name: "nftMint"; isMut: false; isSigner: false },
        { name: "nftEscrow"; isMut: true; isSigner: false },
        { name: "borrowerNftAccount"; isMut: true; isSigner: false },
        { name: "borrower"; isMut: true; isSigner: true },
        { name: "lender"; isMut: true; isSigner: false },
        { name: "tokenProgram"; isMut: false; isSigner: false },
        { name: "systemProgram"; isMut: false; isSigner: false }
      ];
      args: [];
    },
    {
      name: "liquidateLoan";
      accounts: [
        { name: "lendingPool"; isMut: true; isSigner: false },
        { name: "loan"; isMut: true; isSigner: false },
        { name: "nftMint"; isMut: false; isSigner: false },
        { name: "nftEscrow"; isMut: true; isSigner: false },
        { name: "lenderNftAccount"; isMut: true; isSigner: false },
        { name: "lender"; isMut: true; isSigner: true },
        { name: "tokenProgram"; isMut: false; isSigner: false },
        { name: "systemProgram"; isMut: false; isSigner: false }
      ];
      args: [];
    },
    {
      name: "cancelListing";
      accounts: [
        { name: "loan"; isMut: true; isSigner: false },
        { name: "nftMint"; isMut: false; isSigner: false },
        { name: "nftEscrow"; isMut: true; isSigner: false },
        { name: "borrowerNftAccount"; isMut: true; isSigner: false },
        { name: "borrower"; isMut: true; isSigner: true },
        { name: "tokenProgram"; isMut: false; isSigner: false },
        { name: "systemProgram"; isMut: false; isSigner: false }
      ];
      args: [];
    }
  ];
  accounts: [
    {
      name: "lendingPool";
      type: {
        kind: "struct";
        fields: [
          { name: "authority"; type: "publicKey" },
          { name: "nftVault"; type: "publicKey" },
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
          { name: "borrower"; type: "publicKey" },
          { name: "lender"; type: "publicKey" },
          { name: "nftMint"; type: "publicKey" },
          { name: "nftEscrow"; type: "publicKey" },
          { name: "loanAmount"; type: "u64" },
          { name: "interestRateBps"; type: "u16" },
          { name: "durationSeconds"; type: "i64" },
          { name: "startTime"; type: "i64" },
          { name: "status"; type: { defined: "LoanStatus" } },
          { name: "bump"; type: "u8" }
        ];
      };
    }
  ];
  types: [
    {
      name: "LoanStatus";
      type: {
        kind: "enum";
        variants: [
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
    { code: 6008; name: "InvalidNft"; msg: "Invalid NFT: Must be a Token-2022 NFT with 0 decimals and supply of 1" }
  ];
};

export const IDL: NftLending = {
  version: "0.1.0",
  name: "nft_lending",
  instructions: [
    {
      name: "initializeLendingPool",
      accounts: [
        { name: "lendingPool", isMut: true, isSigner: false },
        { name: "authority", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false }
      ],
      args: []
    },
    {
      name: "createLoanListing",
      accounts: [
        { name: "lendingPool", isMut: true, isSigner: false },
        { name: "loan", isMut: true, isSigner: false },
        { name: "nftMint", isMut: false, isSigner: false },
        { name: "borrowerNftAccount", isMut: true, isSigner: false },
        { name: "nftEscrow", isMut: true, isSigner: false },
        { name: "borrower", isMut: true, isSigner: true },
        { name: "tokenProgram", isMut: false, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false }
      ],
      args: [
        { name: "loanAmount", type: "u64" },
        { name: "interestRateBps", type: "u16" },
        { name: "durationSeconds", type: "i64" }
      ]
    },
    {
      name: "fundLoan",
      accounts: [
        { name: "lendingPool", isMut: true, isSigner: false },
        { name: "loan", isMut: true, isSigner: false },
        { name: "borrower", isMut: true, isSigner: false },
        { name: "lender", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false }
      ],
      args: []
    },
    {
      name: "repayLoan",
      accounts: [
        { name: "lendingPool", isMut: true, isSigner: false },
        { name: "loan", isMut: true, isSigner: false },
        { name: "nftMint", isMut: false, isSigner: false },
        { name: "nftEscrow", isMut: true, isSigner: false },
        { name: "borrowerNftAccount", isMut: true, isSigner: false },
        { name: "borrower", isMut: true, isSigner: true },
        { name: "lender", isMut: true, isSigner: false },
        { name: "tokenProgram", isMut: false, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false }
      ],
      args: []
    },
    {
      name: "liquidateLoan",
      accounts: [
        { name: "lendingPool", isMut: true, isSigner: false },
        { name: "loan", isMut: true, isSigner: false },
        { name: "nftMint", isMut: false, isSigner: false },
        { name: "nftEscrow", isMut: true, isSigner: false },
        { name: "lenderNftAccount", isMut: true, isSigner: false },
        { name: "lender", isMut: true, isSigner: true },
        { name: "tokenProgram", isMut: false, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false }
      ],
      args: []
    },
    {
      name: "cancelListing",
      accounts: [
        { name: "loan", isMut: true, isSigner: false },
        { name: "nftMint", isMut: false, isSigner: false },
        { name: "nftEscrow", isMut: true, isSigner: false },
        { name: "borrowerNftAccount", isMut: true, isSigner: false },
        { name: "borrower", isMut: true, isSigner: true },
        { name: "tokenProgram", isMut: false, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false }
      ],
      args: []
    }
  ],
  accounts: [
    {
      name: "lendingPool",
      type: {
        kind: "struct",
        fields: [
          { name: "authority", type: "publicKey" },
          { name: "nftVault", type: "publicKey" },
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
          { name: "borrower", type: "publicKey" },
          { name: "lender", type: "publicKey" },
          { name: "nftMint", type: "publicKey" },
          { name: "nftEscrow", type: "publicKey" },
          { name: "loanAmount", type: "u64" },
          { name: "interestRateBps", type: "u16" },
          { name: "durationSeconds", type: "i64" },
          { name: "startTime", type: "i64" },
          { name: "status", type: { defined: "LoanStatus" } },
          { name: "bump", type: "u8" }
        ]
      }
    }
  ],
  types: [
    {
      name: "LoanStatus",
      type: {
        kind: "enum",
        variants: [
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
    { code: 6008, name: "InvalidNft", msg: "Invalid NFT: Must be a Token-2022 NFT with 0 decimals and supply of 1" }
  ]
};
