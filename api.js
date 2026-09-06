/* ==========================================================
   API LAYER — SynergyScore
   จุดเดียวที่คุยกับ backend ทั้งหมด
   สลับ mock <-> ของจริงได้จากตรงนี้ที่เดียว ไม่ต้องแก้หน้าอื่น
   ========================================================== */

const API_CONFIG = {
    // TODO: เปลี่ยนเป็น base URL จริงตอน backend พร้อม
    baseUrl: 'https://api.synergyscore.example.com',
    // ตั้งเป็น false เมื่อ backend พร้อมใช้งานจริง
    useMock: true,
    mockDelayMs: 700
};

/* ---------- Token storage ----------
   ตอนนี้เก็บใน memory เฉยๆ (หายเมื่อ refresh)
   ถ้าทำเป็นแอป native (Capacitor) ให้เปลี่ยนไปใช้
   Preferences / Secure Storage plugin แทนตรงนี้
   ห้ามใช้ localStorage เก็บ token ใน production
------------------------------------- */
const TokenStore = {
    _token: null,
    get() { return this._token; },
    set(token) { this._token = token; },
    clear() { this._token = null; }
};

/* ---------- Low-level request helper ---------- */
async function apiRequest(path, { method = 'GET', body, isFormData = false } = {}) {
    const headers = {};
    if (!isFormData) {
        headers['Content-Type'] = 'application/json';
    }
    const token = TokenStore.get();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    let response;
    try {
        response = await fetch(`${API_CONFIG.baseUrl}${path}`, {
            method,
            headers,
            body: isFormData ? body : (body ? JSON.stringify(body) : undefined)
        });
    } catch (networkErr) {
        throw new ApiError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ต', 0, null);
    }

    let data = null;
    try {
        data = await response.json();
    } catch (_) {
        // response ไม่มี body หรือไม่ใช่ JSON — ปล่อยผ่าน
    }

    if (!response.ok) {
        const message = (data && (data.message || data.error)) || `เกิดข้อผิดพลาด (${response.status})`;
        throw new ApiError(message, response.status, data);
    }

    return data;
}

class ApiError extends Error {
    constructor(message, status, data) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

/* ---------- Mock helper (ใช้ระหว่างยังไม่มี backendจริง) ---------- */
function mockResponse(data, { fail = false, message = 'เกิดข้อผิดพลาด' } = {}) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (fail) {
                reject(new ApiError(message, 400, null));
            } else {
                resolve(data);
            }
        }, API_CONFIG.mockDelayMs);
    });
}

/* ==========================================================
   MOCK DATABASE — ข้อมูลจำลองสำหรับตอนที่ยังไม่มี backend จริง
   ทุกฟังก์ชันใน API ด้านล่างอ่าน/เขียนจากตรงนี้เมื่อ useMock = true
   พอมี backend จริง ให้ลบส่วนนี้ทิ้งได้เลย เพราะ apiRequest() จะยิงไป
   base URL จริงแทน — โครงสร้างข้อมูลแต่ละก้อนคือ "หน้าตา" ที่ backend
   จริงควรคืนกลับมาให้ตรงกัน
   ========================================================== */
const MOCK_DB = {
    grants: {
        'eng-ai-grant': {
            id: 'eng-ai-grant',
            title: 'ทุนวิจัยนวัตกรรม AI',
            status: 'เปิดรับ',
            budget: '500,000 บาท',
            org: 'บริษัท ABC',
            description: 'ทุนสนับสนุนงานวิจัยและพัฒนานวัตกรรมด้านปัญญาประดิษฐ์ (AI) สำหรับนักศึกษาและนักวิจัยที่สนใจต่อยอดผลงานสู่การใช้งานจริง เปิดรับสมัครผู้ที่มีผลงานหรือแนวคิดโครงการที่เกี่ยวข้อง'
        },
        'sci-postdoc-grant': {
            id: 'sci-postdoc-grant',
            title: 'ทุนวิจัย คณะวิทยาศาสตร์ประยุกต์',
            status: 'เปิดรับ',
            budget: '350,000 บาท',
            org: 'มหาวิทยาลัย',
            description: 'ทุนสนับสนุนนักวิจัยหลังปริญญาเอกด้านวิทยาศาสตร์ประยุกต์ เน้นโครงการที่มีศักยภาพต่อยอดเชิงพาณิชย์หรือเชิงนโยบาย'
        },
        'corporate-tuition-grant': {
            id: 'corporate-tuition-grant',
            title: 'ทุนการศึกษาจากภาคเอกชน',
            status: 'เปิดรับ',
            budget: 'สนับสนุนค่าเทอมตลอดหลักสูตร',
            org: 'ภาคเอกชน (หลายบริษัท)',
            description: 'ทุนการศึกษาสำหรับนักศึกษาทุกสาขาวิชา สนับสนุนค่าเทอมตลอดหลักสูตร พร้อมโอกาสฝึกงานและร่วมงานกับบริษัทพันธมิตรหลังสำเร็จการศึกษา'
        }
    },

    myProjects: [
        { id: 'proj-1', name: 'ระบบแนะนำทุนการศึกษาด้วย AI', status: 'approved', description: 'พัฒนาโมเดลแนะนำทุนที่เหมาะสมกับโปรไฟล์นักศึกษาแต่ละคนโดยอัตโนมัติ', budget: '120,000 THB' },
        { id: 'proj-2', name: 'แอปติดตามค่าใช้จ่ายสำหรับนักศึกษา', status: 'pending', description: 'แอปช่วยวางแผนการเงินระหว่างเรียน พร้อมระบบแจ้งเตือนงบประมาณ', budget: '85,000 THB' },
        { id: 'proj-3', name: 'แพลตฟอร์มแบ่งปันโน้ตเรียนออนไลน์', status: 'ejected', description: 'พื้นที่ให้นักศึกษาแบ่งปันและค้นหาโน้ตสรุปเนื้อหารายวิชา', budget: '60,000 THB' }
    ],

    pendingProjects: [
        { id: 'mgmt-a', name: 'A', email: 'aaaa@gmail.com', status: 'pending' },
        { id: 'mgmt-b', name: 'B', email: 'bbbb@gmail.com', status: 'pending' },
        { id: 'mgmt-c', name: 'C', email: 'cccc@gmail.com', status: 'pending' },
        { id: 'mgmt-d', name: 'D', email: 'dddd@gmail.com', status: 'pending' },
        { id: 'mgmt-e', name: 'E', email: 'eeee@gmail.com', status: 'ejected' }
    ],

    corporateSummary: {
        totalBudgetLabel: '฿2,500,000',
        grantsCount: 8,
        activeGrants: 10,
        budgetUsedLabel: '฿1,250,000',
        budgetUsedPercent: 49.02,
        budgetRemainingLabel: '฿1,300,000',
        budgetRemainingPercent: 50.98
    },

    projectProgress: [
        { name: 'ระบบจับคู่ทุนอัตโนมัติ', percent: 80 },
        { name: 'แอปติดตามค่าใช้จ่ายสำหรับนักศึกษา', percent: 60 },
        { name: 'แพลตฟอร์มแบ่งปันโน้ตเรียนออนไลน์', percent: 40 },
        { name: 'ระบบยืนยันตัวตนนักศึกษา', percent: 20 }
    ],

    reviewQueue: [
        {
            id: 'review-1',
            applicantName: 'นายกิตติ ใจดี',
            university: 'มหาวิทยาลัยเทคโนโลยีพระจอมเกล้า',
            faculty: 'คณะวิศวกรรมศาสตร์',
            email: 'kitti.j@example.com',
            projectTitle: 'AI เพื่อการเกษตรอัจฉริยะ',
            grantName: 'ทุนวิจัยนวัตกรรม AI',
            status: 'submitted',
            sentDate: '22.04.26',
            fileName: 'รายงานโครงการ_AI_เกษตร.pdf',
            fileSizeMB: 2.4
        },
        {
            id: 'review-2',
            applicantName: 'น.ส.พิมพ์ชนก แก้วมณี',
            university: 'มหาวิทยาลัยเชียงใหม่',
            faculty: 'คณะวิทยาศาสตร์',
            email: 'pimchanok.k@example.com',
            projectTitle: 'ระบบวิเคราะห์ข้อมูลภูมิอากาศเพื่อการเกษตร',
            grantName: 'ทุนวิจัย คณะวิทยาศาสตร์ประยุกต์',
            status: 'submitted',
            sentDate: '22.04.26',
            fileName: 'รายงานโครงการ_ภูมิอากาศ.pdf',
            fileSizeMB: 3.1
        },
        {
            id: 'review-3',
            applicantName: 'นายอนุชา ศรีทอง',
            university: 'มหาวิทยาลัยธรรมศาสตร์',
            faculty: 'คณะเศรษฐศาสตร์',
            email: 'anucha.s@example.com',
            projectTitle: 'แพลตฟอร์มระดมทุนเพื่อการศึกษา',
            grantName: 'ทุนการศึกษาจากภาคเอกชน',
            status: 'submitted',
            sentDate: '22.04.26',
            fileName: 'รายงานโครงการ_ระดมทุน.pdf',
            fileSizeMB: 1.8
        }
    ],

    chatContacts: [
        {
            id: 'chat-1',
            name: 'นายกิตติ ใจดี',
            project: 'AI เพื่อการเกษตรอัจฉริยะ',
            online: true,
            messages: [
                { sender: 'them', text: 'สวัสดีครับ ผมส่งเอกสารโครงการเรียบร้อยแล้วครับ', time: '09:12' },
                { sender: 'me', text: 'รับทราบครับ กำลังตรวจสอบให้อยู่นะครับ', time: '09:15' }
            ]
        },
        {
            id: 'chat-2',
            name: 'น.ส.พิมพ์ชนก แก้วมณี',
            project: 'ระบบวิเคราะห์ข้อมูลภูมิอากาศเพื่อการเกษตร',
            online: false,
            messages: [
                { sender: 'them', text: 'รบกวนสอบถามความคืบหน้าการพิจารณาค่ะ', time: 'เมื่อวาน' }
            ]
        },
        {
            id: 'chat-3',
            name: 'นายอนุชา ศรีทอง',
            project: 'แพลตฟอร์มระดมทุนเพื่อการศึกษา',
            online: true,
            messages: []
        }
    ],

    escrowSummary: {
        totalAmountLabel: '999.99 THB.',
        platformFeeLabel: '123,456.78 THB',
        studentPayoutLabel: '123,456.78 THB',
        transactionType: 'โอนเงินเข้า',
        lastUpdatedLabel: '17 October 2026, 15:30 น.'
    },

    disputeThread: [
        { sender: 'company', text: 'รบกวนตรวจสอบการโอนเงินงวดที่ 1 ให้หน่อยครับ ผมโอนไปแล้วตั้งแต่วันที่ 15 ต.ค.' },
        { sender: 'student', text: 'ยังไม่เห็นยอดเข้าบัญชีเลยครับ รบกวนเช็กให้อีกทีได้ไหมครับ' },
        { sender: 'company', text: 'ตรวจสอบแล้วพบว่าธนาคารตีกลับเนื่องจากเลขบัญชีไม่ตรง กรุณายืนยันเลขบัญชีที่ถูกต้องอีกครั้งครับ จะดำเนินการโอนใหม่ให้ทันทีภายใน 1 วันทำการ' },
        { sender: 'student', text: 'ขอบคุณครับ นี่คือเลขบัญชีที่ถูกต้อง: XXX-X-XXXXX-X' },
        { sender: 'company', text: 'โอนเงินใหม่เรียบร้อยแล้วครับ รบกวนตรวจสอบยอดอีกครั้ง' }
    ],

    projectTracking: {
        projectName: 'xxx',
        signingDate: 'xx',
        escrowStatusLabel: 'โอนเงินเรียบร้อยแล้ว',
        escrowTotalLabel: '1,000,000 THB.',
        escrowApprovedLabel: '250,000 THB.',
        escrowApprovedPercent: 25,
        milestones: [
            { number: 1, description: 'deliverable_desc', amountLabel: 'xxx,xxx THB', percentLabel: 'xx % ของงบ', dueDateLabel: 'xx/xx/xxxx', status: 'approved' },
            { number: 2, description: 'deliverable_desc', amountLabel: 'xxx,xxx THB', percentLabel: 'xx % ของงบ', dueDateLabel: 'xx/xx/xxxx', status: 'pending_upload' }
        ]
    }
};

/* ==========================================================
   PUBLIC API — endpoints ที่หน้าต่างๆ เรียกใช้
   ========================================================== */
const API = {
    async login({ email, password }) {
        if (API_CONFIG.useMock) {
            return mockResponse({ token: 'mock-token-123', user: { email } });
        }
        const data = await apiRequest('/auth/login', { method: 'POST', body: { email, password } });
        if (data && data.token) TokenStore.set(data.token);
        return data;
    },

    async registerStudent(payload) {
        if (API_CONFIG.useMock) {
            return mockResponse({ userId: 'mock-student-id' });
        }
        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
            if (value !== null && value !== undefined) formData.append(key, value);
        });
        return apiRequest('/auth/register/student', { method: 'POST', body: formData, isFormData: true });
    },

    async registerCorporate(payload) {
        if (API_CONFIG.useMock) {
            return mockResponse({ userId: 'mock-corporate-id' });
        }
        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
            if (value !== null && value !== undefined) formData.append(key, value);
        });
        return apiRequest('/auth/register/corporate', { method: 'POST', body: formData, isFormData: true });
    },

    async verifyOtp({ code }) {
        if (API_CONFIG.useMock) {
            if (code.length < 6) {
                return mockResponse(null, { fail: true, message: 'กรุณากรอกรหัสให้ครบ 6 หลัก' });
            }
            return mockResponse({ verified: true });
        }
        return apiRequest('/auth/verify-otp', { method: 'POST', body: { code } });
    },

    async resendOtp() {
        if (API_CONFIG.useMock) {
            return mockResponse({ sent: true });
        }
        return apiRequest('/auth/resend-otp', { method: 'POST' });
    },

    async resendVerificationEmail() {
        if (API_CONFIG.useMock) {
            return mockResponse({ sent: true });
        }
        return apiRequest('/auth/resend-verification-email', { method: 'POST' });
    },

    async requestPasswordReset({ email }) {
        if (API_CONFIG.useMock) {
            return mockResponse({ sent: true });
        }
        return apiRequest('/auth/request-password-reset', { method: 'POST', body: { email } });
    },

    /* ---------- Grants ---------- */
    // GET /grants -> Grant[]
    async getGrants() {
        if (API_CONFIG.useMock) {
            return mockResponse(Object.values(MOCK_DB.grants));
        }
        return apiRequest('/grants');
    },

    // GET /grants/:grantId -> Grant { id, title, status, budget, org, description }
    async getGrantById(grantId) {
        if (API_CONFIG.useMock) {
            const grant = MOCK_DB.grants[grantId];
            if (!grant) return mockResponse(null, { fail: true, message: 'ไม่พบทุนนี้' });
            return mockResponse(grant);
        }
        return apiRequest(`/grants/${grantId}`);
    },

    // POST /grants/:grantId/apply -> { applied: true }
    async applyGrant(grantId) {
        if (API_CONFIG.useMock) {
            return mockResponse({ applied: true, grantId });
        }
        return apiRequest(`/grants/${grantId}/apply`, { method: 'POST' });
    },

    /* ---------- Student Projects ---------- */
    // GET /students/me/projects -> Project[] { id, name, status: pending|approved|ejected, description, budget }
    async getMyProjects() {
        if (API_CONFIG.useMock) {
            return mockResponse(MOCK_DB.myProjects);
        }
        return apiRequest('/students/me/projects');
    },

    // POST /proposals (multipart) { projectName, budgetRequest, proposalFile } -> { proposalId }
    async submitProposal(payload) {
        if (API_CONFIG.useMock) {
            return mockResponse({ proposalId: 'mock-proposal-id' });
        }
        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
            if (value !== null && value !== undefined) formData.append(key, value);
        });
        return apiRequest('/proposals', { method: 'POST', body: formData, isFormData: true });
    },

    /* ---------- Management (Verification Console) ---------- */
    // GET /management/projects -> Project[] { id, name, email, status: pending|approved|ejected }
    async getPendingProjects() {
        if (API_CONFIG.useMock) {
            return mockResponse(MOCK_DB.pendingProjects);
        }
        return apiRequest('/management/projects');
    },

    // POST /management/projects/:projectId/approve -> { projectId, status: 'approved' }
    async approveProject(projectId) {
        if (API_CONFIG.useMock) {
            return mockResponse({ projectId, status: 'approved' });
        }
        return apiRequest(`/management/projects/${projectId}/approve`, { method: 'POST' });
    },

    // POST /management/projects/:projectId/reject -> { projectId, status: 'ejected' }
    async rejectProject(projectId) {
        if (API_CONFIG.useMock) {
            return mockResponse({ projectId, status: 'ejected' });
        }
        return apiRequest(`/management/projects/${projectId}/reject`, { method: 'POST' });
    },

    /* ---------- Corporate Dashboard ---------- */
    // GET /corporate/summary -> { totalBudgetLabel, grantsCount, activeGrants, budgetUsedLabel, budgetUsedPercent, budgetRemainingLabel, budgetRemainingPercent }
    async getCorporateSummary() {
        if (API_CONFIG.useMock) {
            return mockResponse(MOCK_DB.corporateSummary);
        }
        return apiRequest('/corporate/summary');
    },

    // GET /corporate/project-progress -> { name, percent }[]
    async getProjectProgress() {
        if (API_CONFIG.useMock) {
            return mockResponse(MOCK_DB.projectProgress);
        }
        return apiRequest('/corporate/project-progress');
    },

    // GET /corporate/review-queue -> ReviewItem[] (ดูรูปร่างเต็มใน getProposalDetail)
    async getReviewQueue() {
        if (API_CONFIG.useMock) {
            return mockResponse(MOCK_DB.reviewQueue);
        }
        return apiRequest('/corporate/review-queue');
    },

    /* ---------- Proposal Reviewer ---------- */
    // GET /proposals/:id -> ReviewItem { id, applicantName, university, faculty, email,
    //   projectTitle, grantName, status, sentDate, fileName, fileSizeMB }
    async getProposalDetail(id) {
        if (API_CONFIG.useMock) {
            const item = MOCK_DB.reviewQueue.find(i => i.id === id);
            if (!item) return mockResponse(null, { fail: true, message: 'ไม่พบข้อเสนอนี้' });
            return mockResponse(item);
        }
        return apiRequest(`/proposals/${id}`);
    },

    // POST /proposals/:id/review { decision: 'approved'|'rejected'|'revision', comment } -> { id, decision }
    async reviewProposal(id, { decision, comment }) {
        if (API_CONFIG.useMock) {
            const item = MOCK_DB.reviewQueue.find(i => i.id === id);
            if (item && (decision === 'approved' || decision === 'rejected')) {
                item.status = decision;
            }
            return mockResponse({ id, decision, comment });
        }
        return apiRequest(`/proposals/${id}/review`, { method: 'POST', body: { decision, comment } });
    },

    // GET /proposals/:id/file -> { url }
    async downloadProposalFile(id) {
        if (API_CONFIG.useMock) {
            return mockResponse({ url: `https://mock-files.synergyscore.example.com/${id}.pdf` });
        }
        return apiRequest(`/proposals/${id}/file`);
    },

    // GET /proposals/:id/history -> HistoryEntry[]
    async getSubmissionHistory(id) {
        if (API_CONFIG.useMock) {
            return mockResponse([]);
        }
        return apiRequest(`/proposals/${id}/history`);
    },

    /* ---------- Chat & Contact Room ---------- */
    // GET /chat/contacts -> Contact[] { id, name, project, online, messages: Message[] }
    async getChatContacts() {
        if (API_CONFIG.useMock) {
            return mockResponse(MOCK_DB.chatContacts);
        }
        return apiRequest('/chat/contacts');
    },

    // GET /chat/contacts/:contactId/messages -> Message[] { sender: 'me'|'them', text, time }
    async getChatThread(contactId) {
        if (API_CONFIG.useMock) {
            const contact = MOCK_DB.chatContacts.find(c => c.id === contactId);
            if (!contact) return mockResponse(null, { fail: true, message: 'ไม่พบห้องแชทนี้' });
            return mockResponse(contact.messages);
        }
        return apiRequest(`/chat/contacts/${contactId}/messages`);
    },

    // POST /chat/contacts/:contactId/messages { text } -> Message { sender: 'me', text, time }
    async sendChatMessage(contactId, text) {
        if (API_CONFIG.useMock) {
            const contact = MOCK_DB.chatContacts.find(c => c.id === contactId);
            const now = new Date();
            const message = {
                sender: 'me',
                text,
                time: now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0')
            };
            if (contact) contact.messages.push(message);
            return mockResponse(message);
        }
        return apiRequest(`/chat/contacts/${contactId}/messages`, { method: 'POST', body: { text } });
    },

    /* ---------- Escrow & Dispute ---------- */
    // GET /escrow/summary -> { totalAmountLabel, platformFeeLabel, studentPayoutLabel, transactionType, lastUpdatedLabel }
    async getEscrowSummary() {
        if (API_CONFIG.useMock) {
            return mockResponse(MOCK_DB.escrowSummary);
        }
        return apiRequest('/escrow/summary');
    },

    // GET /escrow/disputes?contactId= -> Message[] { sender: 'company'|'student', text }
    async getDisputeThread(contactId) {
        if (API_CONFIG.useMock) {
            return mockResponse(MOCK_DB.disputeThread);
        }
        return apiRequest(`/escrow/disputes?contactId=${encodeURIComponent(contactId || '')}`);
    },

    /* ---------- Project & Milestone Tracking ---------- */
    // GET /projects/:projectId/tracking -> { projectName, signingDate, escrowStatusLabel,
    //   escrowTotalLabel, escrowApprovedLabel, escrowApprovedPercent, milestones: Milestone[] }
    async getProjectTracking(projectId) {
        if (API_CONFIG.useMock) {
            return mockResponse(MOCK_DB.projectTracking);
        }
        return apiRequest(`/projects/${projectId}/tracking`);
    },

    // POST /milestones/:milestoneNumber/submit (multipart) { file } -> { milestoneNumber, uploaded: true }
    async submitMilestone(milestoneNumber, file) {
        if (API_CONFIG.useMock) {
            return mockResponse({ milestoneNumber, uploaded: true });
        }
        const formData = new FormData();
        formData.append('file', file);
        return apiRequest(`/milestones/${milestoneNumber}/submit`, { method: 'POST', body: formData, isFormData: true });
    }
};
