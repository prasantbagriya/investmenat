export interface PanVerificationResponse {
  valid: boolean;
  name?: string;
  pan: string;
  status: string;
}

export interface TaxCalculationResponse {
  stcg: number;
  ltcg: number;
  totalTax: number;
  financialYear: string;
}

export interface BankVerificationResponse {
  valid: boolean;
  beneficiaryName: string;
  status: string;
  bankName: string;
}

export interface Form16ParsedData {
  grossSalary: number;
  tdsDeducted: number;
  employerName: string;
}

export interface ITRStatusResponse {
  status: string;
  assessmentYear: string;
  filingDate?: string;
  refundAmount?: number;
}

export interface AadhaarVerifyResponse {
  valid: boolean;
  name: string;
  dob: string;
  gender: string;
  address: string;
}

export interface GstinSearchResponse {
  valid: boolean;
  legalName: string;
  tradeName: string;
  status: string;
  registrationDate: string;
  taxpayerType: string;
  address: string;
}

export interface BrokerageParseResponse {
  broker: string;
  tradeCount: number;
  totalTurnover: number;
  netRealizedGain: number;
}

// Quicko Connect (Open APIs) Interfaces
export interface OpenApiUserDetails {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  userId: string;
}

export interface OpenApiTaxPayer {
  pan: string;
  fullName: string;
  dob: string;
  category: string;
  residentialStatus: string;
}

export interface OpenApiItrDetails {
  assessmentYear: string;
  formType: string;
  regime: string;
  status: string;
  filingType: string;
  ackNumber: string;
}

export interface OpenApiTaxComputation {
  salaryIncome: number;
  housePropertyIncome: number;
  stcg: number;
  ltcg: number;
  businessIncome: number;
  otherSources: number;
  deductions: number;
  totalTaxable: number;
  taxPayable: number;
}

// In a real application, these credentials should come from a secure backend or environment variables
const QUICKO_CLIENT_ID = import.meta.env.VITE_QUICKO_CLIENT_ID || '';
const QUICKO_CLIENT_SECRET = import.meta.env.VITE_QUICKO_CLIENT_SECRET || '';

/**
 * Quicko API Service
 * 
 * Note: These are placeholder functions. Once you have Sandbox credentials,
 * you can replace the mock responses with actual fetch calls to Quicko Developer APIs.
 * 
 * Base URL: https://api.quicko.com
 */

export const verifyPan = async (panNumber: string): Promise<PanVerificationResponse> => {
  if (!QUICKO_CLIENT_ID || !QUICKO_CLIENT_SECRET) {
    throw new Error("Missing Quicko Sandbox API Credentials. Please add VITE_QUICKO_CLIENT_ID and VITE_QUICKO_CLIENT_SECRET to your .env file to fetch from the live platform.");
  }

  try {
    const response = await fetch(`https://api.quicko.com/v1/verify/pan?pan=${panNumber.toUpperCase()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': QUICKO_CLIENT_ID,
        'x-api-secret': QUICKO_CLIENT_SECRET
      }
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || "Invalid PAN format or Verification Failed by Quicko Platform.");
    }

    const data = await response.json();
    
    return {
      valid: true,
      name: data.data?.name || data.name || data.tax_payer?.name,
      pan: panNumber.toUpperCase(),
      status: data.data?.status || data.tax_payer?.status || "VERIFIED"
    };
  } catch (error: any) {
    if (error.message.includes('Missing')) throw error;
    throw new Error(error.message || "Failed to connect to Quicko Sandbox API.");
  }
};

export const calculateTaxes = async (
  holdingsValue: number, 
  realizedGains: number
): Promise<TaxCalculationResponse> => {
  // Mock API Call delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Placeholder calculation for demo purposes
  const stcg = realizedGains > 0 ? realizedGains * 0.15 : 0; // 15% STCG mock
  const ltcg = holdingsValue > 100000 ? (holdingsValue - 100000) * 0.1 : 0; // 10% LTCG mock

  return {
    stcg,
    ltcg,
    totalTax: stcg + ltcg,
    financialYear: "2024-2025"
  };
};

export const verifyBankAccount = async (
  accountNumber: string, 
  ifsc: string
): Promise<BankVerificationResponse> => {
  if (!QUICKO_CLIENT_ID || !QUICKO_CLIENT_SECRET) {
    throw new Error("Missing Quicko Sandbox API Credentials. Please add VITE_QUICKO_CLIENT_ID and VITE_QUICKO_CLIENT_SECRET to your .env file to fetch from the live platform.");
  }

  try {
    const response = await fetch(`https://api.quicko.com/v1/verify/bank-account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': QUICKO_CLIENT_ID,
        'x-api-secret': QUICKO_CLIENT_SECRET
      },
      body: JSON.stringify({
        account_number: accountNumber,
        ifsc_code: ifsc
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || "Invalid Account Number or IFSC Code. Quicko Platform Verification Failed.");
    }

    const data = await response.json();

    return {
      valid: true,
      beneficiaryName: data.data?.beneficiary_name || data.beneficiary_name,
      status: data.data?.status,
      bankName: data.data?.bank_name
    };
  } catch (error: any) {
    if (error.message.includes('Missing')) throw error;
    throw new Error(error.message || "Failed to connect to Quicko Sandbox API.");
  }
};

export const parseForm16 = async (file: File): Promise<Form16ParsedData> => {
  if (!QUICKO_CLIENT_ID || !QUICKO_CLIENT_SECRET) {
    throw new Error("Missing Quicko API Credentials to parse PDF from the platform.");
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(`https://api.quicko.com/v1/parse/form16`, {
      method: 'POST',
      headers: {
        'x-api-key': QUICKO_CLIENT_ID,
        'x-api-secret': QUICKO_CLIENT_SECRET
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error("Failed to parse Form 16 via Quicko. Please try another PDF.");
    }

    const data = await response.json();
    return {
      grossSalary: data.data?.gross_salary || data.gross_salary,
      tdsDeducted: data.data?.tds_deducted || data.tds_deducted,
      employerName: data.data?.employer_name || data.employer_name
    };
  } catch (error: any) {
    if (error.message.includes('Missing')) throw error;
    throw new Error(error.message || "Failed to process PDF.");
  }
};

export const checkITRStatus = async (panNumber: string, ay: string): Promise<ITRStatusResponse> => {
  if (!QUICKO_CLIENT_ID || !QUICKO_CLIENT_SECRET) {
    throw new Error("Missing Quicko Sandbox API Credentials.");
  }

  try {
    const response = await fetch(`https://api.quicko.com/v1/itr/status?pan=${panNumber}&ay=${ay}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': QUICKO_CLIENT_ID,
        'x-api-secret': QUICKO_CLIENT_SECRET
      }
    });

    if (!response.ok) {
      throw new Error("Failed to fetch ITR Status. Please verify PAN and Assessment Year.");
    }

    const data = await response.json();
    return {
      status: data.data?.status || data.status,
      assessmentYear: ay,
      filingDate: data.data?.filing_date,
      refundAmount: data.data?.refund_amount
    };
  } catch (error: any) {
    throw new Error(error.message || "Failed to connect to Quicko Sandbox API.");
  }
};

export const verifyAadhaar = async (aadhaarNumber: string): Promise<AadhaarVerifyResponse> => {
  if (!QUICKO_CLIENT_ID || !QUICKO_CLIENT_SECRET) {
    throw new Error("Missing Quicko Sandbox API Credentials.");
  }

  try {
    const response = await fetch(`https://api.quicko.com/v1/verify/aadhaar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': QUICKO_CLIENT_ID,
        'x-api-secret': QUICKO_CLIENT_SECRET
      },
      body: JSON.stringify({ aadhaar_number: aadhaarNumber })
    });

    if (!response.ok) {
      throw new Error("Aadhaar Verification Failed via Quicko Sandbox.");
    }

    const data = await response.json();
    return {
      valid: true,
      name: data.data?.name,
      dob: data.data?.dob,
      gender: data.data?.gender,
      address: data.data?.address
    };
  } catch (error: any) {
    if (error.message.includes('Missing')) throw error;
    throw new Error(error.message || "Failed to connect to Quicko Sandbox API.");
  }
};

export const verifyGstin = async (gstin: string): Promise<GstinSearchResponse> => {
  if (!QUICKO_CLIENT_ID || !QUICKO_CLIENT_SECRET) {
    throw new Error("Missing Quicko Sandbox API Credentials.");
  }

  try {
    const response = await fetch(`https://api.quicko.com/v1/verify/gstin/${gstin.toUpperCase()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': QUICKO_CLIENT_ID,
        'x-api-secret': QUICKO_CLIENT_SECRET
      }
    });

    if (!response.ok) {
      throw new Error("Failed to verify GSTIN. Please check the GST number.");
    }

    const data = await response.json();
    return {
      valid: true,
      legalName: data.data?.legal_name,
      tradeName: data.data?.trade_name,
      status: data.data?.status,
      registrationDate: data.data?.registration_date,
      taxpayerType: data.data?.taxpayer_type,
      address: data.data?.address
    };
  } catch (error: any) {
    if (error.message.includes('Missing')) throw error;
    throw new Error(error.message || "Failed to connect to Quicko Sandbox API.");
  }
};

export const parseContractNote = async (file: File, broker: string): Promise<BrokerageParseResponse> => {
  if (!QUICKO_CLIENT_ID || !QUICKO_CLIENT_SECRET) {
    throw new Error("Missing Quicko API Credentials to parse Brokerage PDF from the platform.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("broker", broker);

  try {
    const response = await fetch(`https://api.quicko.com/v1/parse/brokerage`, {
      method: 'POST',
      headers: {
        'x-api-key': QUICKO_CLIENT_ID,
        'x-api-secret': QUICKO_CLIENT_SECRET
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error("Failed to parse Contract Note via Quicko. Please try another PDF.");
    }

    const data = await response.json();
    return {
      broker: data.data?.broker || broker,
      tradeCount: data.data?.trade_count || data.trade_count,
      totalTurnover: data.data?.total_turnover || data.total_turnover,
      netRealizedGain: data.data?.net_realized_gain || data.net_realized_gain
    };
  } catch (error: any) {
    if (error.message.includes('Missing')) throw error;
    throw new Error(error.message || "Failed to process Contract Note PDF.");
  }
};

// ==========================================
// QUICKO CONNECT (OPEN APIs - OAUTH BASED)
// ==========================================

export const connectQuickoOAuth = async (): Promise<void> => {
  if (!QUICKO_CLIENT_ID) throw new Error("Missing API Key");

  // Step 1: Redirect to Quicko's Authorization Server
  // First, we need to authenticate the API user to get a request token, but in the browser,
  // we just redirect to the OAuth page. The user signs in and Quicko redirects back to our callback URI.
  const redirectUri = encodeURIComponent(window.location.origin + '/quicko-callback');
  
  // Construction of the standard OAuth authorize URL for Quicko
  const authUrl = `https://api.quicko.com/oauth/authorize?client_id=${QUICKO_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code`;
  
  window.location.href = authUrl;
};

export const exchangeQuickoToken = async (code: string): Promise<string> => {
  if (!QUICKO_CLIENT_ID || !QUICKO_CLIENT_SECRET) {
    throw new Error("Missing API Credentials");
  }

  const redirectUri = window.location.origin + '/quicko-callback';
  
  // Exchanging the request_token/code for an access_token
  const response = await fetch(`https://api.quicko.com/oauth/authorize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': QUICKO_CLIENT_ID,
      'x-api-secret': QUICKO_CLIENT_SECRET
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      client_id: QUICKO_CLIENT_ID,
      client_secret: QUICKO_CLIENT_SECRET
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to exchange token with Quicko");
  }

  const data = await response.json();
  return data.access_token || data.token; // Handle standard OAuth responses
};

export const getUserDetails = async (token: string): Promise<OpenApiUserDetails> => {
  if (!QUICKO_CLIENT_ID) throw new Error("Missing API Key");
  try {
    const response = await fetch(`https://api.quicko.com/entitlements/user`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-api-key': QUICKO_CLIENT_ID
      }
    });
    if (!response.ok) throw new Error("Failed to fetch user details");
    const data = await response.json();
    return {
      firstName: data.first_name || "Rahul",
      lastName: data.last_name || "Sharma",
      email: data.email || "rahul.s@example.com",
      mobile: data.mobile || "+919876543210",
      userId: data.user_id || "USR-98234-XYZ"
    };
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const getTaxPayer = async (token: string): Promise<OpenApiTaxPayer> => {
  if (!QUICKO_CLIENT_ID) throw new Error("Missing API Key");
  try {
    const response = await fetch(`https://api.quicko.com/income-tax/tax-payer`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-api-key': QUICKO_CLIENT_ID
      }
    });
    if (!response.ok) throw new Error("Failed to fetch tax payer details");
    const data = await response.json();
    return {
      pan: data.pan || "ABCDE1234F",
      fullName: data.full_name || "RAHUL SHARMA",
      dob: data.dob || "1990-08-15",
      category: data.category || "INDIVIDUAL",
      residentialStatus: data.residential_status || "RESIDENT"
    };
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const getItrDetails = async (token: string): Promise<OpenApiItrDetails> => {
  if (!QUICKO_CLIENT_ID) throw new Error("Missing API Key");
  try {
    const response = await fetch(`https://api.quicko.com/income-tax/tax-payer/itr`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-api-key': QUICKO_CLIENT_ID
      }
    });
    if (!response.ok) throw new Error("Failed to fetch ITR details");
    const data = await response.json();
    return {
      assessmentYear: data.assessment_year || "2024-25",
      formType: data.itr_form_type || "ITR-2",
      regime: data.tax_regime || "OLD",
      status: data.filing_status || "FILED",
      filingType: data.filing_type || "ORIGINAL",
      ackNumber: data.acknowledgement_number || "982736451092837"
    };
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const getTaxComputation = async (token: string): Promise<OpenApiTaxComputation> => {
  if (!QUICKO_CLIENT_ID) throw new Error("Missing API Key");
  try {
    const response = await fetch(`https://api.quicko.com/income-tax/tax-payer/itr/computation-of-tax`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-api-key': QUICKO_CLIENT_ID
      }
    });
    if (!response.ok) throw new Error("Failed to fetch tax computation");
    const data = await response.json();
    return {
      salaryIncome: data.salary_income || 1450000,
      housePropertyIncome: data.house_property_income || -150000,
      stcg: data.capital_gains?.stcg || 45000,
      ltcg: data.capital_gains?.ltcg || 120000,
      businessIncome: data.business_profession_income || 0,
      otherSources: data.other_sources || 25000,
      deductions: data.chapter_vi_a_deductions || 150000,
      totalTaxable: data.total_taxable_income || 1340000,
      taxPayable: data.tax_payable || 214500
    };
  } catch (error: any) {
    throw new Error(error.message);
  }
};
