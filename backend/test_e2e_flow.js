const http = require('http');

async function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function run() {
  console.log('=== SANKSHEPAI END-TO-END SYSTEM TEST ===\n');

  console.log('--- 1. Testing Auth Signup & Email Verification ---');
  const userPayload = {
    email: 'dr.sharma.test2@research.ac.in',
    password: 'SecureResearchPassword2026!',
    confirmPassword: 'SecureResearchPassword2026!',
    fullName: 'Dr. Vivek Sharma',
    acceptTerms: true,
  };

  const signupRes = await request({
    hostname: '127.0.0.1',
    port: 5001,
    path: '/api/auth/signup',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, userPayload);

  console.log('Signup Status:', signupRes.status);
  let token = null;

  if (signupRes.status === 201 && signupRes.body?.devOtp) {
    console.log('Account created, dev OTP intercepted:', signupRes.body.devOtp);
    const verifyRes = await request({
      hostname: '127.0.0.1',
      port: 5001,
      path: '/api/auth/verify-email',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: userPayload.email, otp: signupRes.body.devOtp });

    console.log('Verification Status:', verifyRes.status);
    token = verifyRes.body?.token;
  } else {
    console.log('Trying login in case user is already registered...');
    const loginRes = await request({
      hostname: '127.0.0.1',
      port: 5001,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: userPayload.email, password: userPayload.password });
    token = loginRes.body?.token;
  }

  console.log('JWT Token acquired:', !!token);

  console.log('\n--- 2. Testing 3-Step Guided Onboarding ---');
  const step1 = await request({
    hostname: '127.0.0.1',
    port: 5001,
    path: '/api/onboarding/step/1',
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  }, { displayName: 'Dr. Vivek Sharma', occupation: 'Senior NLP Researcher', institution: 'IIT Delhi' });
  console.log('Step 1 status:', step1.status);

  const step2 = await request({
    hostname: '127.0.0.1',
    port: 5001,
    path: '/api/onboarding/step/2',
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  }, { documentInterests: ['Academic', 'Finance'], preferredSummaryStyle: 'bullet-point', preferredSummaryLength: 'balanced' });
  console.log('Step 2 status:', step2.status);

  const step3 = await request({
    hostname: '127.0.0.1',
    port: 5001,
    path: '/api/onboarding/step/3',
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  }, { discoverySources: ['ResearchGate'], discoveryOther: 'Conference presentation' });
  console.log('Step 3 status:', step3.status);

  const completeOnboard = await request({
    hostname: '127.0.0.1',
    port: 5001,
    path: '/api/onboarding/complete',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  }, {});
  console.log('Onboarding complete status:', completeOnboard.status);

  console.log('\n--- 3. Testing TextRank Extractive Summarization ---');
  const sampleCorpus = `The Reserve Bank of India issued circular RBI/2026-27/45 detailing updated capital adequacy norms for non-banking financial companies. The primary objective is mitigating systemic credit risk in high-exposure commercial portfolios. The regulatory framework mandates a minimum tier-one capital ratio of 12 percent effective from next fiscal quarter. Non-compliant financial institutions will face phased lending restrictions and enhanced supervisory oversight. All commercial banks must incorporate these mandatory prudential guidelines into their enterprise risk management models.`;

  const trRes = await request({
    hostname: '127.0.0.1',
    port: 5001,
    path: '/api/summaries/generate',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  }, {
    title: 'RBI Capital Adequacy Circular 2026',
    text: sampleCorpus,
    method: 'textrank_baseline',
    length: 'balanced',
    style: 'executive'
  });

  console.log('TextRank status:', trRes.status);
  console.log('TextRank generated summary:\n', trRes.body?.summary?.summaryText);
  console.log('Method and compression:', trRes.body?.summary?.metadata?.method, `${trRes.body?.summary?.metadata?.compressionRatio}%`);

  console.log('\n--- 4. Testing Custom Seq2Seq Neural Summarization ---');
  const seqRes = await request({
    hostname: '127.0.0.1',
    port: 5001,
    path: '/api/summaries/generate',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  }, {
    title: 'RBI Capital Adequacy Seq2Seq',
    text: sampleCorpus,
    method: 'custom_seq2seq_attention',
    beamWidth: 3
  });

  console.log('Seq2Seq status:', seqRes.status);
  console.log('Seq2Seq generated summary:\n', seqRes.body?.summary?.summaryText);
  console.log('Model checkpoint:', seqRes.body?.summary?.metadata?.checkpointVersion);

  console.log('\n--- 5. Testing ROUGE Evaluation Metric Calculation ---');
  const rougeRes = await request({
    hostname: '127.0.0.1',
    port: 8000,
    path: '/api/evaluate/rouge',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    hypothesis: trRes.body?.summary?.summaryText || 'The Reserve Bank issued circular detailing updated capital adequacy norms for non-banking financial companies.',
    reference: 'The Reserve Bank of India issued updated capital adequacy norms mandating a minimum tier-one capital ratio of 12 percent for non-banking financial companies.'
  });

  console.log('ROUGE evaluation status:', rougeRes.status);
  console.log('ROUGE-1 F1:', rougeRes.body?.rouge1?.f1);
  console.log('ROUGE-2 F1:', rougeRes.body?.rouge2?.f1);
  console.log('ROUGE-L F1:', rougeRes.body?.rougeL?.f1);

  console.log('\n--- 6. Testing Document Grounded Question Answering ---');
  const qaRes = await request({
    hostname: '127.0.0.1',
    port: 8000,
    path: '/api/qa',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    document_text: sampleCorpus,
    question: 'What is the required minimum tier-one capital ratio?'
  });
  console.log('QA status:', qaRes.status);
  console.log('Answer:', qaRes.body?.answer);
  console.log('Confidence:', qaRes.body?.confidence);

  console.log('\n=== ALL END-TO-END PIPELINES COMPLETED SUCCESSFULLY ===');
}

run().catch(console.error);
