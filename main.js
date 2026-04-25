import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, setDoc, getDoc, query, orderBy, serverTimestamp, getDocs, where, deleteDoc, updateDoc, limit } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ================= CẤU HÌNH FIREBASE =================
const firebaseConfig = {
    apiKey: "AIzaSyAGOfRZ7J2leGMq5ScJXrOAN1jE2Dlb8eQ",
    authDomain: "diemdanhsinhvien-2026.firebaseapp.com",
    projectId: "diemdanhsinhvien-2026",
    storageBucket: "diemdanhsinhvien-2026.firebasestorage.app",
    messagingSenderId: "103070242231",
    appId: "1:103070242231:web:c565fe5655b07ce7210432"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const classStatusRef = doc(db, "settings", "classConfig"); 
const attendanceCollection = collection(db, "attendance"); 
const usersCollection = collection(db, "users"); 
const logsCollection = collection(db, "system_logs"); 

// ================= THÔNG SỐ GPS =================
const SCHOOL_LAT = 10.371727869842815; 
const SCHOOL_LON = 105.43255463334839; 
const MAX_DISTANCE = 10000; 

// ================= HÀM TIỆN ÍCH =================
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '<i class="fa-solid fa-circle-check"></i>' : '<i class="fa-solid fa-circle-exclamation"></i>';
    toast.innerHTML = `${icon} <span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
    var R = 6371000; 
    var dLat = (lat2-lat1) * (Math.PI/180); 
    var dLon = (lon2-lon1) * (Math.PI/180); 
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) + 
            Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; 
}

async function writeLog(actionStr) {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if(!user) return;
    try {
        await addDoc(logsCollection, {
            email: user.email, 
            role: user.role, 
            action: actionStr,
            time: new Date().toLocaleTimeString('vi-VN') + ' - ' + new Date().toLocaleDateString('vi-VN'),
            timestamp: serverTimestamp()
        });
    } catch(e) { console.error("Lỗi ghi log", e); }
}

// Cập nhật đồng hồ
setInterval(() => { 
    const clockElement = document.getElementById('real-time-clock'); 
    if(clockElement) clockElement.textContent = new Date().toLocaleTimeString('vi-VN'); 
}, 1000);

// ================= XỬ LÝ GIAO DIỆN AUTH =================
window.toggleAuth = function(formType = 'login') {
    document.getElementById('login-form').classList.remove('active'); 
    document.getElementById('register-form').classList.remove('active'); 
    document.getElementById('admin-login-form').classList.remove('active');
    
    if(formType === 'register') {
        document.getElementById('register-form').classList.add('active');
    } else if(formType === 'admin') {
        document.getElementById('admin-login-form').classList.add('active');
    } else {
        document.getElementById('login-form').classList.add('active');
    }
}

document.querySelectorAll('.toggle-password').forEach(icon => {
    icon.addEventListener('click', function() {
        const input = this.previousElementSibling;
        if (input.type === 'password') { 
            input.type = 'text'; 
            this.classList.replace('fa-eye', 'fa-eye-slash'); 
        } else { 
            input.type = 'password'; 
            this.classList.replace('fa-eye-slash', 'fa-eye'); 
        }
    });
});

// ================= XÁC THỰC (ĐĂNG KÝ / ĐĂNG NHẬP) =================
document.getElementById('form-register-submit').addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('reg-email').value; 
    const pass = document.getElementById('reg-password').value; 
    const confirmPass = document.getElementById('reg-confirm-password').value; 
    const role = document.querySelector('input[name="role"]:checked').value;
    
    if(pass !== confirmPass) return showToast('Mật khẩu xác nhận không khớp!', 'error');
    
    try {
        const q = query(usersCollection, where("email", "==", email));
        if(!(await getDocs(q)).empty) return showToast('Email này đã tồn tại!', 'error');
        await addDoc(usersCollection, { email, password: pass, role });
        showToast('Đăng ký thành công!', 'success'); 
        toggleAuth('login'); 
    } catch(err) { showToast('Lỗi hệ thống!', 'error'); }
});

document.getElementById('form-login-submit').addEventListener('submit', async function(e) {
    e.preventDefault(); 
    const email = document.getElementById('login-email').value; 
    const pass = document.getElementById('login-password').value;
    try {
        const q = query(usersCollection, where("email", "==", email), where("password", "==", pass)); 
        const snap = await getDocs(q);
        if(snap.empty) return showToast('Sai Email hoặc Mật khẩu!', 'error');
        
        let userData = {}, userId = ""; 
        snap.forEach(doc => { userData = doc.data(); userId = doc.id; });
        
        if(userData.role === 'admin') return showToast('Admin vui lòng vào cổng riêng!', 'error');
        
        localStorage.setItem('currentUser', JSON.stringify({ id: userId, email: userData.email, role: userData.role }));
        showToast(`Đăng nhập thành công!`, 'success'); 
        loadDashboard();
    } catch(err) { showToast('Lỗi Server', 'error'); }
});

document.getElementById('form-admin-login-submit').addEventListener('submit', async function(e) {
    e.preventDefault(); 
    const email = document.getElementById('admin-login-email').value; 
    const pass = document.getElementById('admin-login-password').value;
    try {
        const q = query(usersCollection, where("email", "==", email), where("password", "==", pass)); 
        const snap = await getDocs(q);
        
        if(snap.empty) return showToast('Xác thực thất bại!', 'error');
        
        let userData = {}, userId = ""; 
        snap.forEach(doc => { userData = doc.data(); userId = doc.id; });
        
        if(userData.role !== 'admin') return showToast('Tài khoản không có quyền Admin!', 'error');
        
        localStorage.setItem('currentUser', JSON.stringify({ id: userId, email: userData.email, role: userData.role }));
        showToast('Truy cập Admin thành công', 'success'); 
        loadDashboard();
    } catch(err) { showToast('Lỗi Server', 'error'); }
});

document.getElementById('btn-logout').addEventListener('click', () => { 
    localStorage.removeItem('currentUser'); 
    location.reload(); 
});

// ================= LOGIC CHUYỂN ĐỔI PANEL (ĐA TẦNG) =================
function switchPanel(panelId) {
    // Ẩn tất cả các panel
    document.querySelectorAll('.panel').forEach(p => { 
        p.classList.remove('active'); 
        p.classList.add('hidden'); 
    });
    // Hiện panel được chọn
    const target = document.getElementById(panelId);
    if(target) { 
        target.classList.remove('hidden'); 
        target.classList.add('active'); 
    }
}

// Cấu hình khi vừa đăng nhập xong
function loadDashboard() {
    const user = JSON.parse(localStorage.getItem('currentUser')); 
    if (!user) return;
    
    document.getElementById('auth-section').classList.add('hidden'); 
    document.getElementById('dashboard-section').classList.remove('hidden');
    document.getElementById('user-display-email').textContent = user.email; 
    
    // Đổ dữ liệu vào Tab Cài đặt (Profile)
    const profileEmailEl = document.getElementById('profile-email');
    if(profileEmailEl) profileEmailEl.textContent = user.email;
    
    const roleSpan = document.getElementById('user-display-role');
    const roleProfile = document.getElementById('profile-role');
    const avatarImgs = document.querySelectorAll('.avatar');
    
    // Reset ẩn tất cả menu trước khi phân quyền
    document.querySelectorAll('.role-all, .role-teacher, .role-admin, .role-student').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.role-all').forEach(el => el.style.display = 'flex');

    if(user.role === 'admin') {
        roleSpan.textContent = 'Quản trị viên'; 
        if(roleProfile) roleProfile.textContent = 'Quản trị viên Hệ thống';
        roleSpan.style.background = 'linear-gradient(90deg, #dc3545, #991b1b)';
        avatarImgs.forEach(img => img.src = `https://ui-avatars.com/api/?name=Admin&background=dc3545&color=fff&rounded=true&bold=true`);
        
        // Hiện Menu Admin
        document.querySelectorAll('.role-admin').forEach(el => el.style.display = 'flex');
        switchPanel('admin-panel');
        document.querySelector('[data-target="admin-panel"]').classList.add('active');
        
        loadAdminUsers(); loadAuditLogs(); loadStudentsList();

    } else if(user.role === 'teacher') {
        roleSpan.textContent = 'Giảng viên'; 
        if(roleProfile) roleProfile.textContent = 'Giảng viên (Educator)';
        roleSpan.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)';
        avatarImgs.forEach(img => img.src = `https://ui-avatars.com/api/?name=${user.email.charAt(0)}&background=f59e0b&color=fff&rounded=true&bold=true`);
        
        // Hiện Menu Teacher
        document.querySelectorAll('.role-teacher').forEach(el => el.style.display = 'flex');
        switchPanel('teacher-panel');
        document.querySelector('[data-target="teacher-panel"]').classList.add('active');
        
        loadStudentsList();

    } else {
        roleSpan.textContent = 'Sinh viên'; 
        if(roleProfile) roleProfile.textContent = 'Sinh viên Đại học';
        avatarImgs.forEach(img => img.src = `https://ui-avatars.com/api/?name=${user.email.charAt(0)}&background=4f46e5&color=fff&rounded=true&bold=true`);
        
        // Hiện Menu Student
        document.querySelectorAll('.role-student').forEach(el => el.style.display = 'flex');
        switchPanel('student-home-panel');
        document.querySelector('[data-target="student-home-panel"]').classList.add('active');
    }
}
if(localStorage.getItem('currentUser')) loadDashboard();

// Bắt sự kiện Click trên thanh Menu Sidebar
document.querySelectorAll('.nav-menu li').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.nav-menu li').forEach(li => li.classList.remove('active')); 
        this.classList.add('active');
        const targetId = this.getAttribute('data-target'); 
        switchPanel(targetId);
        if(targetId === 'reports-panel') renderChart();
    });
});

// Bắt sự kiện Click trên Tab của phần Cài Đặt
document.querySelectorAll('.settings-tabs li').forEach(tab => {
    tab.addEventListener('click', function() {
        document.querySelectorAll('.settings-tabs li').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        
        document.querySelectorAll('.setting-section').forEach(s => { 
            s.classList.remove('active'); 
            s.style.display = 'none'; 
        });
        
        const target = document.getElementById(this.getAttribute('data-tab'));
        if(target) { 
            target.style.display = 'block'; 
            target.classList.add('active'); 
        }
    });
});

// ================= GIẢNG VIÊN TẠO LỚP & MÃ QR =================
const classToggle = document.getElementById('class-toggle'); 
const statusText = document.getElementById('class-status-text'); 
const teacherClassInput = document.getElementById('teacher-class-code'); 
const qrDisplayArea = document.getElementById('teacher-qr-display'); 
const qrImage = document.getElementById('qr-image'); 
let isClassCurrentlyActive = false; 

onSnapshot(classStatusRef, (docSnap) => {
    if (docSnap.exists()) {
        isClassCurrentlyActive = docSnap.data().isActive; 
        if(classToggle) classToggle.checked = isClassCurrentlyActive;
        if(statusText) { 
            statusText.textContent = isClassCurrentlyActive ? "ĐANG MỞ CHỜ CHECK-IN" : "ĐÃ ĐÓNG CỔNG"; 
            statusText.style.color = isClassCurrentlyActive ? "#10b981" : "#ef4444"; 
        }
        if(isClassCurrentlyActive && teacherClassInput && teacherClassInput.value.trim() !== '') {
            qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(teacherClassInput.value.trim())}`; 
            if(qrDisplayArea) qrDisplayArea.style.display = 'block';
        } else if(qrDisplayArea) { 
            qrDisplayArea.style.display = 'none'; 
        }
    }
});

if(classToggle) {
    classToggle.addEventListener('change', async function() {
        if(this.checked && teacherClassInput.value.trim() === '') { 
            showToast('Nhập Mã lớp trước khi Mở cổng!', 'error'); 
            this.checked = false; 
            return; 
        }
        try { 
            await setDoc(classStatusRef, { isActive: this.checked }); 
            showToast(this.checked ? 'Đã MỞ cổng Check-in!' : 'Đã ĐÓNG cổng Check-in!', 'success'); 
            writeLog(this.checked ? `Mở cổng điểm danh: ${teacherClassInput.value}` : 'Đóng cổng điểm danh'); 
        } catch (error) { this.checked = !this.checked; }
    });
}

// ================= SINH VIÊN QUÉT QR =================
const btnStartScan = document.getElementById('btn-start-scan'); 
const qrReaderDiv = document.getElementById('qr-reader'); 
const attClassCodeInput = document.getElementById('att-class-code'); 
let html5QrcodeScanner;

if(btnStartScan) {
    btnStartScan.addEventListener('click', () => {
        if(qrReaderDiv.style.display === 'block') {
            if(html5QrcodeScanner) html5QrcodeScanner.clear(); 
            qrReaderDiv.style.display = 'none';
            btnStartScan.innerHTML = '<i class="fa-solid fa-camera-viewfinder"></i> Bật Camera Quét Mã Lớp'; 
            btnStartScan.style.background = 'linear-gradient(90deg, #6366f1, #4f46e5)';
        } else {
            qrReaderDiv.style.display = 'block'; 
            btnStartScan.innerHTML = '<i class="fa-solid fa-xmark"></i> Tắt Camera'; 
            btnStartScan.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
            
            html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: {width: 250, height: 250} }, false);
            html5QrcodeScanner.render((decodedText) => { 
                attClassCodeInput.value = decodedText; 
                showToast('Quét mã thành công!', 'success'); 
                html5QrcodeScanner.clear(); 
                qrReaderDiv.style.display = 'none'; 
                btnStartScan.innerHTML = '<i class="fa-solid fa-camera-viewfinder"></i> Bật Camera Quét Mã Lớp'; 
                btnStartScan.style.background = 'linear-gradient(90deg, #6366f1, #4f46e5)'; 
            }, (error) => {  });
        }
    });
}

// ================= SINH VIÊN SUBMIT CHECK-IN (GPS) =================
const formAttendance = document.getElementById('form-attendance');
if (formAttendance) {
    formAttendance.addEventListener('submit', function(e) {
        e.preventDefault(); 
        if (!isClassCurrentlyActive) return showToast('Cổng điểm danh hiện đang đóng!', 'error'); 
        
        showToast('Đang quét vệ tinh kiểm tra GPS...', 'success');
        
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                const distance = getDistanceFromLatLonInM(SCHOOL_LAT, SCHOOL_LON, position.coords.latitude, position.coords.longitude);
                if (distance > MAX_DISTANCE) return showToast(`CẢNH BÁO BẢO MẬT: Bạn đang cách xa trường ${Math.round(distance)} mét!`, 'error');
                
                try { 
                    const mssvStr = document.getElementById('att-mssv').value; 
                    await addDoc(attendanceCollection, { 
                        mssv: mssvStr, 
                        name: document.getElementById('att-name').value, 
                        classCode: document.getElementById('att-class-code').value, 
                        time: new Date().toLocaleTimeString('vi-VN') + ' - ' + new Date().toLocaleDateString('vi-VN'), 
                        status: "Hợp lệ", 
                        timestamp: serverTimestamp() 
                    }); 
                    showToast('Xác thực GPS thành công. Đã Check-in!', 'success'); 
                    writeLog(`Sinh viên [${mssvStr}] đã check-in`); 
                    this.reset(); 
                } catch (error) { showToast('Lỗi máy chủ khi lưu dữ liệu!', 'error'); }
            }, (error) => { showToast('LỖI: Vui lòng cho phép trình duyệt truy cập Vị trí (GPS)!', 'error'); });
        } else { showToast('Trình duyệt không hỗ trợ công nghệ GPS!', 'error'); }
    });
}

// ================= SINH VIÊN XEM LỊCH SỬ STREAK =================
const btnSearchMyHistory = document.getElementById('btn-search-my-history');
if(btnSearchMyHistory) {
    btnSearchMyHistory.addEventListener('click', async () => {
        const mssv = document.getElementById('search-my-mssv').value.trim().toUpperCase(); 
        if(!mssv) return alert('Vui lòng nhập MSSV!');
        
        const tbody = document.getElementById('my-history-list'); 
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Đang truy xuất máy chủ...</td></tr>'; 
        document.getElementById('streak-container').style.display = 'none'; 
        
        try {
            const querySnapshot = await getDocs(query(collection(db, "attendance"), where("mssv", "==", mssv))); 
            tbody.innerHTML = '';
            
            if (querySnapshot.empty) return tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: #ef4444; font-weight:bold;">Không tìm thấy dữ liệu học tập!</td></tr>';
            
            let index = 1; let uniqueDates = new Set(); 
            querySnapshot.forEach((docSnap) => { 
                const data = docSnap.data(); 
                const dateStr = data.time.split(' - ')[1]; 
                if(dateStr) uniqueDates.add(dateStr); 
                
                const tr = document.createElement('tr'); 
                tr.innerHTML = `<td>${index++}</td><td style="font-weight: 800; color:#0f172a;">${data.classCode}</td><td>${data.time}</td><td><span class="badge" style="background: linear-gradient(90deg, #10b981, #059669); color:white; padding: 6px 12px; font-size:11px;">${data.status}</span></td>`; 
                tbody.appendChild(tr); 
            });
            
            document.getElementById('student-streak-count').textContent = uniqueDates.size; 
            document.getElementById('streak-container').style.display = 'block';
        } catch (error) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Lỗi Server!</td></tr>'; }
    });
}

// ================= ADMIN & TEACHER THAO TÁC =================
async function loadAuditLogs() {
    try { 
        const qLog = query(logsCollection, orderBy("timestamp", "desc"), limit(50)); 
        const snap = await getDocs(qLog); 
        const tbody = document.getElementById('admin-audit-list'); 
        if(!tbody) return; tbody.innerHTML = ''; 
        
        if(snap.empty) return tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#10b981;">Hệ thống sạch. Chưa có log</td></tr>'; 
        
        snap.forEach(docSnap => { 
            const data = docSnap.data(); 
            const tr = document.createElement('tr'); 
            tr.innerHTML = `<td style="color:#64748b; border:none; border-bottom:1px solid #334155;">${data.time}</td><td style="font-weight:700; color:#818cf8; border:none; border-bottom:1px solid #334155;">${data.email} <span style="font-weight:normal; color:#475569; font-size:11px;">(${data.role})</span></td><td style="color:#cbd5e1; border:none; border-bottom:1px solid #334155;">${data.action}</td>`; 
            tbody.appendChild(tr); 
        }); 
    } catch(e) { }
}

async function loadStudentsList() {
    try { 
        const snap = await getDocs(query(usersCollection, where("role", "==", "student"))); 
        const tbody = document.getElementById('students-roster-list'); 
        if(!tbody) return; tbody.innerHTML = ''; 
        
        if(snap.empty) return tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Hệ thống chưa có người dùng</td></tr>'; 
        
        let index = 1; 
        snap.forEach(docSnap => { 
            const tr = document.createElement('tr'); 
            tr.innerHTML = `<td>${index++}</td><td style="font-weight:600;">${docSnap.data().email}</td><td><span class="badge" style="background:#64748b; color:white;">Student</span></td>`; 
            tbody.appendChild(tr); 
        }); 
    } catch(e) { }
}

const btnAddStudent = document.getElementById('btn-add-student');
if(btnAddStudent) { 
    btnAddStudent.addEventListener('click', async () => { 
        const email = document.getElementById('add-stu-email').value; 
        const pass = document.getElementById('add-stu-pass').value; 
        if(!email || !pass) return showToast('Vui lòng nhập đủ các trường!', 'error'); 
        try { 
            const q = query(usersCollection, where("email", "==", email)); 
            if(!(await getDocs(q)).empty) return showToast('Tài khoản đã tồn tại!', 'error'); 
            await addDoc(usersCollection, { email, password: pass, role: 'student' }); 
            showToast('Khởi tạo tài khoản thành công!', 'success'); 
            writeLog(`Tạo tài khoản sinh viên: ${email}`); 
            document.getElementById('add-stu-email').value = ''; 
            document.getElementById('add-stu-pass').value = ''; 
            loadStudentsList(); 
        } catch(e) { } 
    }); 
}

// Biểu đồ
let attendanceChartInstance = null;
async function renderChart() {
    try { 
        const snap = await getDocs(attendanceCollection); 
        const dataMap = {}; 
        snap.forEach(docSnap => { 
            const dateOnly = docSnap.data().time.split(' - ')[1]; 
            if(dateOnly) dataMap[dateOnly] = (dataMap[dateOnly] || 0) + 1; 
        }); 
        
        const labels = Object.keys(dataMap).sort(); 
        const dataValues = labels.map(label => dataMap[label]); 
        const ctx = document.getElementById('attendanceChart'); 
        
        if(!ctx) return; 
        if(attendanceChartInstance) attendanceChartInstance.destroy(); 
        
        attendanceChartInstance = new Chart(ctx, { 
            type: 'line', 
            data: { 
                labels: labels, 
                datasets: [{ 
                    label: 'Lượt Check-in Toàn Hệ thống', 
                    data: dataValues, 
                    borderColor: '#4f46e5', 
                    backgroundColor: 'rgba(79, 70, 229, 0.1)', 
                    borderWidth: 3, tension: 0.4, fill: true, 
                    pointBackgroundColor: '#1e3a8a', pointRadius: 6, pointHoverRadius: 8 
                }] 
            }, 
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } } 
        }); 
    } catch(e) {}
}

const btnRefreshChart = document.getElementById('btn-refresh-chart'); 
if(btnRefreshChart) btnRefreshChart.addEventListener('click', renderChart);

async function loadAdminUsers() {
    try { 
        const snap = await getDocs(usersCollection); 
        const tbody = document.getElementById('admin-users-list'); 
        if(!tbody) return; tbody.innerHTML = ''; 
        document.getElementById('admin-total-users').textContent = snap.size; 
        
        let index = 1; 
        snap.forEach(docSnap => { 
            const data = docSnap.data(); const docId = docSnap.id; 
            let roleBadge = data.role === 'admin' ? '<span class="badge" style="background:linear-gradient(90deg, #dc3545, #991b1b); color:white;">Admin</span>' : (data.role === 'teacher' ? '<span class="badge" style="background:linear-gradient(90deg, #f59e0b, #d97706); color:white;">Giảng viên</span>' : '<span class="badge" style="background:#64748b; color:white;">Sinh viên</span>'); 
            const currentUser = JSON.parse(localStorage.getItem('currentUser')); 
            let actionHtml = (currentUser.id !== docId) ? `<button class="btn btn-danger btn-sm" style="padding:8px 12px; border-radius:8px; font-weight:bold; font-size:12px; display:inline-block;" onclick="window.deleteUser('${docId}', '${data.email}')"><i class="fa-solid fa-trash"></i> Hủy Diệt</button>` : `<span style="color:#94a3b8; font-size:12px; font-weight:bold;">[MY_ACCOUNT]</span>`; 
            
            const tr = document.createElement('tr'); 
            tr.innerHTML = `<td>${index++}</td><td style="font-weight:700;">${data.email}</td><td>${roleBadge}</td><td>${actionHtml}</td>`; 
            tbody.appendChild(tr); 
        }); 
    } catch(e) {}
}

window.deleteUser = async function(docId, email) { 
    if(confirm('CẢNH BÁO BẢO MẬT: BẠN CÓ CHẮC CHẮN MUỐN THANH TRỪNG TÀI KHOẢN NÀY?')) { 
        try { await deleteDoc(doc(db, "users", docId)); showToast('Tài khoản đã bị loại bỏ!', 'success'); writeLog(`Thanh trừng tài khoản: ${email}`); loadAdminUsers(); loadStudentsList(); } catch(e) {} 
    } 
}

const btnAdminRecoverPass = document.getElementById('btn-admin-recover-pass');
if(btnAdminRecoverPass) { 
    btnAdminRecoverPass.addEventListener('click', async () => { 
        const email = document.getElementById('admin-recover-email').value; 
        const newPass = document.getElementById('admin-recover-pass').value; 
        if(!email || !newPass) return showToast('Thiếu Parameters!', 'error'); 
        try { 
            const snap = await getDocs(query(usersCollection, where("email", "==", email))); 
            if(snap.empty) return showToast('Email không tồn tại!', 'error'); 
            await updateDoc(doc(db, "users", snap.docs[0].id), { password: newPass }); 
            showToast(`Cấp quyền truy cập mới thành công!`, 'success'); 
            writeLog(`Reset Security Key cho: ${email}`); 
            document.getElementById('admin-recover-email').value = ''; 
            document.getElementById('admin-recover-pass').value = ''; 
        } catch(e) {} 
    }); 
}

const btnResetData = document.getElementById('btn-reset-data');
if(btnResetData) { 
    btnResetData.addEventListener('click', async () => { 
        if(confirm('MẬT LỆNH: BẠN SẮP XÓA TOÀN BỘ LOG ĐIỂM DANH TRÊN MÁY CHỦ. XÁC NHẬN?')) { 
            try { 
                showToast('Đang tiến hành Format...', 'success'); 
                const snapshot = await getDocs(attendanceCollection); 
                snapshot.forEach(async (docItem) => await deleteDoc(doc(db, "attendance", docItem.id))); 
                writeLog(`[CRITICAL] FORMAT TOÀN BỘ DATA ĐIỂM DANH`); 
                setTimeout(() => showToast(`Quá trình Format hoàn tất!`, 'success'), 1500); 
            } catch(error) {} 
        } 
    }); 
}

// Đổi mật khẩu
const btnChangePass = document.getElementById('btn-change-pass'); 
if(btnChangePass) {
    btnChangePass.addEventListener('click', async () => { 
        const oldPass = document.getElementById('setting-old-pass').value; 
        const newPass = document.getElementById('setting-new-pass').value; 
        const user = JSON.parse(localStorage.getItem('currentUser')); 
        
        if(!oldPass || !newPass) return showToast('Vui lòng điền đủ thông tin!', 'error'); 
        try { 
            const userRef = doc(db, "users", user.id); 
            const userSnap = await getDoc(userRef); 
            if(userSnap.data().password !== oldPass) return showToast('Mật khẩu cũ không đúng!', 'error'); 
            
            await updateDoc(userRef, { password: newPass }); 
            showToast('Cập nhật thành công!', 'success'); 
            document.getElementById('setting-old-pass').value=''; 
            document.getElementById('setting-new-pass').value=''; 
            writeLog('Thay đổi mật khẩu cá nhân');
        } catch(e){} 
    });
}

const btnExportExcel = document.getElementById('btn-export-excel');
if(btnExportExcel) { 
    btnExportExcel.addEventListener('click', async () => { 
        try { 
            showToast('Đang trích xuất Báo cáo...', 'success'); 
            const snap = await getDocs(query(attendanceCollection, orderBy("timestamp", "desc"))); 
            let csvContent = "\uFEFFSTT,MSSV,Họ Tên,Mã Lớp,Thời gian Check-in,Trạng thái\n"; 
            let index = 1; 
            snap.forEach((docSnap) => { 
                const item = docSnap.data(); 
                csvContent += `${index++},${item.mssv},${item.name.replace(/,/g, " ")},${item.classCode},${item.time},${item.status}\n`; 
            }); 
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); 
            const link = document.createElement("a"); 
            link.href = URL.createObjectURL(blob); 
            link.download = `UniCheck_Report_${new Date().getTime()}.csv`; 
            link.click(); 
            writeLog(`Xuất file Báo cáo Excel`); 
        } catch (error) { } 
    }); 
}

const q = query(attendanceCollection, orderBy("timestamp", "desc")); 
onSnapshot(q, (snapshot) => { 
    const tbody = document.getElementById('attendance-list'); 
    if(!tbody) return; tbody.innerHTML = ''; 
    const statCheckedIn = document.getElementById('stat-checked-in'); 
    const statPercent = document.getElementById('stat-percent'); 
    
    if(statCheckedIn) statCheckedIn.textContent = snapshot.size; 
    if(statPercent) statPercent.textContent = (snapshot.size > 0 ? Math.round((snapshot.size / 40) * 100) : 0) + '%'; 
    
    if (snapshot.empty) return tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#94a3b8; font-style:italic;">Hệ thống chưa ghi nhận lượt truy cập nào</td></tr>'; 
    
    let index = 1; 
    snapshot.forEach((docSnap) => { 
        const item = docSnap.data(); 
        const tr = document.createElement('tr'); 
        tr.innerHTML = `<td>${index++}</td><td style="font-weight:800;">${item.mssv}</td><td style="font-weight:500;">${item.name}</td><td>${item.classCode}</td><td style="color:#64748b;">${item.time}</td><td><span class="badge" style="background:linear-gradient(90deg, #10b981, #059669); padding:6px 12px; font-size:12px; color:white;">${item.status}</span></td>`; 
        tbody.appendChild(tr); 
    }); 
});

const btnFilterHistory = document.getElementById('btn-filter-history');
if(btnFilterHistory) { 
    btnFilterHistory.addEventListener('click', async () => { 
        const dateInput = document.getElementById('filter-date').value; 
        const classInput = document.getElementById('filter-class').value.trim().toLowerCase(); 
        let searchDate = dateInput ? `${parseInt(dateInput.split('-')[2])}/${parseInt(dateInput.split('-')[1])}/${dateInput.split('-')[0]}` : ""; 
        const tbody = document.getElementById('history-list'); 
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Querying Data...</td></tr>'; 
        
        try { 
            const querySnapshot = await getDocs(collection(db, "attendance")); 
            tbody.innerHTML = ''; 
            let index = 1, hasData = false; 
            querySnapshot.forEach((doc) => { 
                const item = doc.data(); 
                if ((!searchDate || item.time.includes(searchDate)) && (!classInput || item.classCode.toLowerCase().includes(classInput))) { 
                    hasData = true; 
                    const tr = document.createElement('tr'); 
                    tr.innerHTML = `<td>${index++}</td><td style="font-weight:800;">${item.mssv}</td><td style="font-weight:500;">${item.name}</td><td>${item.classCode}</td><td style="color:#64748b;">${item.time}</td><td><span class="badge" style="background:linear-gradient(90deg, #10b981, #059669); padding:6px 12px; font-size:12px; color:white;">${item.status}</span></td>`; 
                    tbody.appendChild(tr); 
                } 
            }); 
            if(!hasData) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: #ef4444; font-weight:bold;">Không tìm thấy dữ liệu khớp bộ lọc!</td></tr>'; 
        } catch (error) {} 
    }); 
}
// ================= HỆ THỐNG GIAO DIỆN (DARK MODE) =================
const btnThemeLight = document.getElementById('btn-theme-light');
const btnThemeDark = document.getElementById('btn-theme-dark');
const body = document.body;

// Kiểm tra xem user đã từng lưu theme gì chưa (nếu chưa thì mặc định là Light)
const savedTheme = localStorage.getItem('unicheckTheme');
if (savedTheme === 'dark') {
    enableDarkMode();
}

// Lắng nghe sự kiện click
if(btnThemeLight && btnThemeDark) {
    btnThemeLight.addEventListener('click', () => {
        disableDarkMode();
        localStorage.setItem('unicheckTheme', 'light');
    });

    btnThemeDark.addEventListener('click', () => {
        enableDarkMode();
        localStorage.setItem('unicheckTheme', 'dark');
    });
}

function enableDarkMode() {
    body.classList.add('dark-theme');
    if(btnThemeDark && btnThemeLight) {
        // Style cho nút đang active (Dark)
        btnThemeDark.style.borderColor = 'var(--primary-color)';
        btnThemeDark.style.color = 'var(--primary-color)';
        
        // Style cho nút unactive (Light)
        btnThemeLight.style.borderColor = 'var(--border-color)';
        btnThemeLight.style.color = 'var(--text-muted)';
    }
}

function disableDarkMode() {
    body.classList.remove('dark-theme');
    if(btnThemeDark && btnThemeLight) {
        // Style cho nút đang active (Light)
        btnThemeLight.style.borderColor = 'var(--primary-color)';
        btnThemeLight.style.color = 'var(--primary-color)';
        
        // Style cho nút unactive (Dark)
        btnThemeDark.style.borderColor = 'var(--border-color)';
        btnThemeDark.style.color = 'var(--text-muted)';
    }
}