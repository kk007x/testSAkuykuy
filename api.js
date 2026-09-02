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
    }
};
