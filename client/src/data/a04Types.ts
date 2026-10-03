export type A04Fact = 'unknown' | 'yes' | 'no';
export type A04EngineeringStage = 'unknown' | 'not_applicable' | 'design' | 'construction' | 'commissioning' | 'operation';
export type A04PublicVideoContext = 'unknown' | 'none' | 'article7' | 'article9_exception';
export type A04SubStatus = 'unreviewed' | 'compliant' | 'partial' | 'noncompliant' | 'na';

export type A04ProfileFacts = {
  scopeApproved: boolean;
  gb55029Applicable: A04Fact;
  gbHighRiskObject: A04Fact;
  engineeringStage: A04EngineeringStage;
  alarmSystem: A04Fact;
  videoSystem: A04Fact;
  accessControlSystem: A04Fact;
  patrolSystem: A04Fact;
  parkingSystem: A04Fact;
  securityCheckSystem: A04Fact;
  publicVideoContext: A04PublicVideoContext;
  faceRecognition: A04Fact;
  personalDataProcessing: A04Fact;
  secretAdjacentUnit: A04Fact;
  undergroundCrossing: A04Fact;
  lowAirIntake: A04Fact;
  guardhouseExteriorDoor: A04Fact;
  securityDoorInstalled: A04Fact;
  specialDoorOrStorage: A04Fact;
  sharedImportantBuilding: A04Fact;
  controlCenter: A04Fact;
  networkOperator: A04Fact;
  showSupplemental: boolean;
};

export const defaultA04Profile: A04ProfileFacts = {
  scopeApproved: false,
  gb55029Applicable: 'unknown',
  gbHighRiskObject: 'unknown',
  engineeringStage: 'unknown',
  alarmSystem: 'unknown',
  videoSystem: 'unknown',
  accessControlSystem: 'unknown',
  patrolSystem: 'unknown',
  parkingSystem: 'unknown',
  securityCheckSystem: 'unknown',
  publicVideoContext: 'unknown',
  faceRecognition: 'unknown',
  personalDataProcessing: 'unknown',
  secretAdjacentUnit: 'unknown',
  undergroundCrossing: 'unknown',
  lowAirIntake: 'unknown',
  guardhouseExteriorDoor: 'unknown',
  securityDoorInstalled: 'unknown',
  specialDoorOrStorage: 'unknown',
  sharedImportantBuilding: 'unknown',
  controlCenter: 'unknown',
  networkOperator: 'unknown',
  showSupplemental: false,
};

export type A04SubAssertion = {
  id: string;
  label: string;
  status: A04SubStatus;
  evidence: string;
  remediation: string;
};

export type A04SourceAssessment = {
  sourceId: string;
  clause: string;
  applicability: 'unknown' | 'applicable' | 'excluded';
  rationale: string;
  evidence: string;
  conclusion: A04SubStatus;
};

export type A04ControlDetails = {
  objectLocation: string;
  applicabilityReason: string;
  sourceApplicability: string;
  measuredValue: string;
  measuredUnit: string;
  naBasis: string;
  reviewReason: string;
  deadlineSource: string;
  temporaryProtection: string;
  verificationEvidence: string;
  verifier: string;
  verifiedAt: string;
  closedAt: string;
  needsReview: boolean;
  subAssertions: A04SubAssertion[];
  sourceAssessments: A04SourceAssessment[];
};

export const emptyA04Details = (needsReview = false): A04ControlDetails => ({
  objectLocation: '',
  applicabilityReason: '',
  sourceApplicability: '',
  measuredValue: '',
  measuredUnit: '',
  naBasis: '',
  reviewReason: '',
  deadlineSource: '',
  temporaryProtection: '',
  verificationEvidence: '',
  verifier: '',
  verifiedAt: '',
  closedAt: '',
  needsReview,
  subAssertions: [],
  sourceAssessments: [],
});
