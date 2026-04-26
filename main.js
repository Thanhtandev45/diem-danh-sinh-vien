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
const attendanceCollection = collection(db, "attendance"); 
const usersCollection = collection(db, "users"); 
const logsCollection = collection(db, "system_logs"); 

const SCHOOL_LAT = 10.371727869842815; 
const SCHOOL_LON = 105.43255463334839; 
const MAX_DISTANCE = 50000; 

// ================= HÀM TIỆN ÍCH =================
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    if(!toastContainer) return;
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
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
}

async function writeLog(actionStr) {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if(!user) return;
    try {
        await addDoc(logsCollection, { email: user.email, role: user.role, action: actionStr, time: new Date().toLocaleTimeString('vi-VN') + ' - ' + new Date().toLocaleDateString('vi-VN'), timestamp: serverTimestamp() });
    } catch(e) {}
}

setInterval(() => { 
    const clockElement = document.getElementById('real-time-clock'); 
    if(clockElement) clockElement.textContent = new Date().toLocaleTimeString('vi-VN'); 
}, 1000);

// ================= XỬ LÝ GIAO DIỆN AUTH =================
window.toggleAuth = function(formType = 'login') {
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    const targetId = (formType === 'admin') ? 'admin-login-form' : formType + '-form';
    const target = document.getElementById(targetId);
    if(target) target.classList.add('active');
}

document.querySelectorAll('.toggle-password').forEach(icon => {
    icon.addEventListener('click', function() {
        const input = this.previousElementSibling;
        input.type = input.type === 'password' ? 'text' : 'password';
        this.classList.toggle('fa-eye'); this.classList.toggle('fa-eye-slash');
    });
});

// ================= XÁC THỰC (ĐĂNG KÝ / ĐĂNG NHẬP) =================
document.getElementById('form-register-submit')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('reg-email').value; 
    const pass = document.getElementById('reg-password').value; 
    const confirmPass = document.getElementById('reg-confirm-password').value; 
    const role = document.querySelector('input[name="role"]:checked').value;
    const teacherCode = document.getElementById('reg-teacher-code') ? document.getElementById('reg-teacher-code').value : '';

    if(role === 'teacher' && teacherCode !== 'AGU2026') return showToast('Mã nội bộ Giảng viên không đúng!', 'error');
    if(pass !== confirmPass) return showToast('Mật khẩu xác nhận không khớp!', 'error');
    
    try {
        const q = query(usersCollection, where("email", "==", email));
        if(!(await getDocs(q)).empty) return showToast('Email này đã tồn tại!', 'error');
        await addDoc(usersCollection, { email, password: pass, role });
        showToast('Đăng ký thành công!', 'success'); toggleAuth('login'); 
    } catch(err) { showToast('Lỗi hệ thống!', 'error'); }
});

document.getElementById('form-login-submit')?.addEventListener('submit', async function(e) {
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
        showToast(`Đăng nhập thành công!`, 'success'); loadDashboard();
    } catch(err) { showToast('Lỗi Server', 'error'); }
});

document.getElementById('form-admin-login-submit')?.addEventListener('submit', async function(e) {
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
        showToast('Truy cập Admin thành công', 'success'); loadDashboard();
    } catch(err) { showToast('Lỗi Server', 'error'); }
});

document.getElementById('btn-logout')?.addEventListener('click', () => { 
    localStorage.removeItem('currentUser'); location.reload(); 
});

// ================= LOGIC CHUYỂN ĐỔI PANEL =================
function switchPanel(panelId) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(panelId);
    if(target) target.classList.add('active');
}

// ================= LOAD DASHBOARD =================
function loadDashboard() {
    const user = JSON.parse(localStorage.getItem('currentUser')); 
    if (!user) return;
    
    document.getElementById('auth-section').classList.add('hidden'); 
    document.getElementById('dashboard-section').classList.remove('hidden');
    document.getElementById('user-display-email').textContent = user.email; 
    if(document.getElementById('profile-email')) document.getElementById('profile-email').textContent = user.email;
    
    const roleSpan = document.getElementById('user-display-role');
    const avatarImgs = document.querySelectorAll('.avatar');
    
    document.querySelectorAll('.role-all, .role-teacher, .role-admin, .role-student').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.role-all').forEach(el => el.style.display = 'flex');

    if(user.role === 'admin') {
        roleSpan.textContent = 'Quản trị viên'; roleSpan.style.background = 'linear-gradient(90deg, #dc3545, #991b1b)';
        avatarImgs.forEach(img => img.src = `https://ui-avatars.com/api/?name=Admin&background=dc3545&color=fff&rounded=true&bold=true`);
        document.querySelectorAll('.role-admin').forEach(el => el.style.display = 'flex');
        switchPanel('admin-panel');
        loadAdminUsers(); loadAuditLogs(); loadStudentsList(); renderChart();

    } else if(user.role === 'teacher') {
        roleSpan.textContent = 'Giảng viên'; roleSpan.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)';
        avatarImgs.forEach(img => img.src = `https://ui-avatars.com/api/?name=${user.email.charAt(0)}&background=f59e0b&color=fff&rounded=true&bold=true`);
        document.querySelectorAll('.role-teacher').forEach(el => el.style.display = 'flex');
        switchPanel('teacher-panel');
        initTeacherRealtime(user.id); loadStudentsList(); renderChart();

    } else {
        roleSpan.textContent = 'Sinh viên'; 
        avatarImgs.forEach(img => img.src = `https://ui-avatars.com/api/?name=${user.email.charAt(0)}&background=4f46e5&color=fff&rounded=true&bold=true`);
        document.querySelectorAll('.role-student').forEach(el => el.style.display = 'flex');
        switchPanel('student-home-panel');
    }
}
if(localStorage.getItem('currentUser')) loadDashboard();

// Bắt sự kiện Click Menu
document.querySelectorAll('.nav-menu li').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.nav-menu li').forEach(li => li.classList.remove('active')); 
        this.classList.add('active');
        const targetId = this.getAttribute('data-target'); 
        switchPanel(targetId);
        if(targetId === 'reports-panel') renderChart();
    });
});

document.querySelectorAll('.settings-tabs li').forEach(tab => {
    tab.addEventListener('click', function() {
        document.querySelectorAll('.settings-tabs li').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        document.querySelectorAll('.setting-section').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(this.getAttribute('data-tab'));
        if(target) target.classList.add('active'); 
    });
});

// ================= GIẢNG VIÊN (REAL-TIME & MỞ CỔNG) =================
let classUnsubscribe = null; let attendanceUnsubscribe = null;

function initTeacherRealtime(lecturerId) {
    const classStatusRef = doc(db, "classConfigs", lecturerId); 
    const classToggle = document.getElementById('class-toggle');
    const statusText = document.getElementById('class-status-text');
    const teacherClassInput = document.getElementById('teacher-class-code');
    const qrImage = document.getElementById('qr-image');
    const qrArea = document.getElementById('teacher-qr-display');

    if(classUnsubscribe) classUnsubscribe();
    classUnsubscribe = onSnapshot(classStatusRef, (docSnap) => {
        let isActive = false; let currentClass = "";
        if (docSnap.exists()) {
            isActive = docSnap.data().isActive === true; 
            currentClass = docSnap.data().classCode || "";
        }

        if(classToggle) classToggle.checked = isActive;
        if(statusText) { 
            statusText.textContent = isActive ? "ĐANG MỞ CHỜ CHECK-IN" : "ĐÃ ĐÓNG CỔNG"; 
            statusText.style.color = isActive ? "#10b981" : "#ef4444"; 
        }

        if(isActive && currentClass !== "") {
            const qrData = `${currentClass}|${lecturerId}`;
            if(qrImage) qrImage.src = `https://quickchart.io/qr?size=250x250&text=${encodeURIComponent(qrData)}`;
            if(qrArea) qrArea.style.display = 'block'; 
            if(teacherClassInput) teacherClassInput.value = currentClass; 
        } else {
            if(qrArea) qrArea.style.display = 'none'; 
        }
    });

    if(classToggle) {
        classToggle.onchange = async (e) => {
            const isChecked = e.target.checked;
            const classCodeValue = teacherClassInput ? teacherClassInput.value.trim() : "";
            
            if(isChecked && classCodeValue === '') { 
                showToast('Bác phải nhập Mã lớp trước khi mở cổng!', 'error'); 
                e.target.checked = false; return; 
            }
            try {
                await setDoc(classStatusRef, { isActive: isChecked, classCode: classCodeValue, lecturerId: lecturerId });
                showToast(isChecked ? 'Đã mở cổng quét QR!' : 'Đã đóng cổng!', 'success');
                writeLog(isChecked ? `Mở lớp ${classCodeValue}` : "Đóng cổng điểm danh");
            } catch(error) { showToast('Lỗi mạng!', 'error'); e.target.checked = !isChecked; }
        };
    }
    
    const q = query(attendanceCollection, where("lecturerId", "==", lecturerId));
    if(attendanceUnsubscribe) attendanceUnsubscribe();
    attendanceUnsubscribe = onSnapshot(q, (snapshot) => {
        const tbody = document.getElementById('attendance-list'); if(!tbody) return; tbody.innerHTML = '';
        const statCheckedIn = document.getElementById('stat-checked-in');
        if(statCheckedIn) statCheckedIn.textContent = snapshot.size;
        
        if(snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#94a3b8; font-style:italic;">Chưa có sinh viên nào Check-in</td></tr>'; return;
        }

        let docsArray = []; snapshot.forEach(doc => docsArray.push(doc.data()));
        docsArray.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));

        let index = 1;
        docsArray.forEach((item) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${index++}</td><td style="font-weight:800;">${item.mssv}</td><td>${item.name}</td><td>${item.classCode}</td><td style="color:#64748b;">${item.time}</td><td><span class="badge" style="background:#10b981; color:white;">Hợp lệ</span></td>`;
            tbody.appendChild(tr);
        });
    });
} 

// ================= SINH VIÊN QUÉT QR CỰC XỊN =================
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
                attClassCodeInput.value = decodedText; showToast('Quét mã thành công!', 'success'); 
                html5QrcodeScanner.clear(); qrReaderDiv.style.display = 'none'; 
                btnStartScan.innerHTML = '<i class="fa-solid fa-camera-viewfinder"></i> Bật Camera Quét Mã Lớp'; 
                btnStartScan.style.background = 'linear-gradient(90deg, #6366f1, #4f46e5)'; 
            }, (error) => {  });
        }
    });
}

// ================= SINH VIÊN SUBMIT CHECK-IN (GPS) =================
document.getElementById('form-attendance')?.addEventListener('submit', function(e) {
    e.preventDefault(); 
    const qrRaw = document.getElementById('att-class-code').value;
    if(!qrRaw.includes("|")) return showToast('Mã QR không hợp lệ!', 'error');
    const [classCode, lecturerId] = qrRaw.split("|");

    showToast('Đang quét vệ tinh kiểm tra GPS...', 'success');
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const distance = getDistanceFromLatLonInM(SCHOOL_LAT, SCHOOL_LON, position.coords.latitude, position.coords.longitude);
            if (distance > MAX_DISTANCE) return showToast(`CẢNH BÁO BẢO MẬT: Bạn đang cách xa trường!`, 'error');
            
            try { 
                const mssvStr = document.getElementById('att-mssv').value; 
                await addDoc(attendanceCollection, { 
                    mssv: mssvStr, name: document.getElementById('att-name').value, 
                    classCode: classCode, lecturerId: lecturerId, 
                    time: new Date().toLocaleTimeString('vi-VN') + ' - ' + new Date().toLocaleDateString('vi-VN'), 
                    status: "Hợp lệ", timestamp: serverTimestamp() 
                }); 
                showToast('Xác thực GPS thành công. Đã Check-in!', 'success'); this.reset(); 
            } catch (error) { showToast('Lỗi máy chủ khi lưu dữ liệu!', 'error'); }
        }, (error) => { showToast('LỖI: Vui lòng cho phép trình duyệt truy cập Vị trí (GPS)!', 'error'); });
    } else { showToast('Trình duyệt không hỗ trợ GPS!', 'error'); }
});

// ================= SINH VIÊN XEM LỊCH SỬ STREAK =================
document.getElementById('btn-search-my-history')?.addEventListener('click', async () => {
    const mssv = document.getElementById('search-my-mssv').value.trim().toUpperCase(); 
    if(!mssv) return showToast('Vui lòng nhập MSSV!', 'error');
    
    const tbody = document.getElementById('my-history-list'); 
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Đang truy xuất máy chủ...</td></tr>'; 
    document.getElementById('streak-container').style.display = 'none'; 
    
    try {
        const querySnapshot = await getDocs(query(collection(db, "attendance"), where("mssv", "==", mssv))); 
        tbody.innerHTML = '';
        if (querySnapshot.empty) return tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: #ef4444; font-weight:bold;">Không tìm thấy dữ liệu học tập!</td></tr>';
        
        let index = 1; let uniqueDates = new Set(); 
        querySnapshot.forEach((docSnap) => { 
            const data = docSnap.data(); const dateStr = data.time.split(' - ')[1]; 
            if(dateStr) uniqueDates.add(dateStr); 
            const tr = document.createElement('tr'); 
            tr.innerHTML = `<td>${index++}</td><td style="font-weight: 800;">${data.classCode}</td><td>${data.time}</td><td><span class="badge" style="background:#10b981; color:white;">${data.status}</span></td>`; 
            tbody.appendChild(tr); 
        });
        document.getElementById('student-streak-count').textContent = uniqueDates.size; 
        document.getElementById('streak-container').style.display = 'block';
    } catch (error) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Lỗi Server!</td></tr>'; }
});

// ================= ADMIN & TEACHER THAO TÁC =================
async function loadAuditLogs() {
    try { 
        const qLog = query(logsCollection, orderBy("timestamp", "desc"), limit(50)); 
        const snap = await getDocs(qLog); 
        const tbody = document.getElementById('admin-audit-list'); if(!tbody) return; tbody.innerHTML = ''; 
        if(snap.empty) return tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#10b981;">Hệ thống sạch</td></tr>'; 
        snap.forEach(docSnap => { 
            const data = docSnap.data(); const tr = document.createElement('tr'); 
            tr.innerHTML = `<td style="color:#64748b;">${data.time}</td><td style="font-weight:700; color:#818cf8;">${data.email} <span style="font-size:11px;">(${data.role})</span></td><td style="color:#cbd5e1;">${data.action}</td>`; 
            tbody.appendChild(tr); 
        }); 
    } catch(e) { }
}

async function loadStudentsList() {
    try { 
        const snap = await getDocs(query(usersCollection, where("role", "==", "student"))); 
        const tbody = document.getElementById('students-roster-list'); if(!tbody) return; tbody.innerHTML = ''; 
        if(snap.empty) return tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;">Hệ thống chưa có sinh viên</td></tr>'; 
        let index = 1; 
        snap.forEach(docSnap => { 
            const tr = document.createElement('tr'); 
            tr.innerHTML = `<td>${index++}</td><td style="font-weight:600; color:var(--text-main);">${docSnap.data().email}</td>`; 
            tbody.appendChild(tr); 
        }); 
    } catch(e) { }
}

document.getElementById('btn-add-student')?.addEventListener('click', async () => { 
    const email = document.getElementById('add-stu-email').value; const pass = document.getElementById('add-stu-pass').value; 
    if(!email || !pass) return showToast('Vui lòng nhập đủ các trường!', 'error'); 
    try { 
        const q = query(usersCollection, where("email", "==", email)); 
        if(!(await getDocs(q)).empty) return showToast('Tài khoản đã tồn tại!', 'error'); 
        await addDoc(usersCollection, { email, password: pass, role: 'student' }); 
        showToast('Khởi tạo tài khoản thành công!', 'success'); writeLog(`Tạo tài khoản sinh viên: ${email}`); 
        document.getElementById('add-stu-email').value = ''; document.getElementById('add-stu-pass').value = ''; 
        loadStudentsList(); 
    } catch(e) { } 
}); 

async function loadAdminUsers() {
    try { 
        const snap = await getDocs(usersCollection); 
        const tbody = document.getElementById('admin-users-list'); if(!tbody) return; tbody.innerHTML = ''; 
        document.getElementById('admin-total-users').textContent = snap.size; 
        let index = 1; 
        snap.forEach(docSnap => { 
            const data = docSnap.data(); const docId = docSnap.id; 
            let roleBadge = data.role === 'admin' ? '<span class="badge" style="background:#dc3545; color:white;">Admin</span>' : (data.role === 'teacher' ? '<span class="badge" style="background:#f59e0b; color:white;">Giảng viên</span>' : '<span class="badge" style="background:#64748b; color:white;">Sinh viên</span>'); 
            const currentUser = JSON.parse(localStorage.getItem('currentUser')); 
            let actionHtml = (currentUser.id !== docId) ? `<button class="btn btn-danger btn-sm" style="padding:8px 12px; border-radius:8px; font-weight:bold; font-size:12px;" onclick="window.deleteUser('${docId}', '${data.email}')"><i class="fa-solid fa-trash"></i> Xóa</button>` : `<span style="color:#94a3b8; font-size:12px; font-weight:bold;">[MY_ACCOUNT]</span>`; 
            const tr = document.createElement('tr'); 
            tr.innerHTML = `<td>${index++}</td><td style="font-weight:700;">${data.email}</td><td>${roleBadge}</td><td>${actionHtml}</td>`; 
            tbody.appendChild(tr); 
        }); 
    } catch(e) {}
}

window.deleteUser = async function(docId, email) { 
    if(confirm('CẢNH BÁO: CHẮC CHẮN XÓA TÀI KHOẢN NÀY?')) { 
        try { await deleteDoc(doc(db, "users", docId)); showToast('Đã xóa!', 'success'); writeLog(`Xóa tài khoản: ${email}`); loadAdminUsers(); loadStudentsList(); } catch(e) {} 
    } 
}

document.getElementById('btn-admin-recover-pass')?.addEventListener('click', async () => { 
    const email = document.getElementById('admin-recover-email').value; const newPass = document.getElementById('admin-recover-pass').value; 
    if(!email || !newPass) return showToast('Thiếu thông tin!', 'error'); 
    try { 
        const snap = await getDocs(query(usersCollection, where("email", "==", email))); 
        if(snap.empty) return showToast('Email không tồn tại!', 'error'); 
        await updateDoc(doc(db, "users", snap.docs[0].id), { password: newPass }); 
        showToast(`Cấp lại thành công!`, 'success'); writeLog(`Reset pass cho: ${email}`); 
        document.getElementById('admin-recover-email').value = ''; document.getElementById('admin-recover-pass').value = ''; 
    } catch(e) {} 
}); 

document.getElementById('btn-reset-data')?.addEventListener('click', async () => { 
    if(confirm('BẠN SẮP XÓA TOÀN BỘ LOG ĐIỂM DANH TRÊN MÁY CHỦ. XÁC NHẬN?')) { 
        try { 
            showToast('Đang tiến hành Format...', 'success'); 
            const snapshot = await getDocs(attendanceCollection); 
            snapshot.forEach(async (docItem) => await deleteDoc(doc(db, "attendance", docItem.id))); 
            writeLog(`[CRITICAL] FORMAT TOÀN BỘ DATA ĐIỂM DANH`); 
            setTimeout(() => showToast(`Hoàn tất!`, 'success'), 1500); 
        } catch(error) {} 
    } 
}); 

document.getElementById('btn-change-pass')?.addEventListener('click', async () => { 
    const oldPass = document.getElementById('setting-old-pass').value; const newPass = document.getElementById('setting-new-pass').value; 
    const user = JSON.parse(localStorage.getItem('currentUser')); 
    if(!oldPass || !newPass) return showToast('Vui lòng điền đủ thông tin!', 'error'); 
    try { 
        const userRef = doc(db, "users", user.id); const userSnap = await getDoc(userRef); 
        if(userSnap.data().password !== oldPass) return showToast('Mật khẩu cũ không đúng!', 'error'); 
        await updateDoc(userRef, { password: newPass }); showToast('Cập nhật thành công!', 'success'); 
        document.getElementById('setting-old-pass').value=''; document.getElementById('setting-new-pass').value=''; writeLog('Đổi mật khẩu cá nhân');
    } catch(e){} 
});

// ================= BIỂU ĐỒ (LỌC THEO GIẢNG VIÊN) =================
let attendanceChartInstance = null;
async function renderChart() {
    try { 
        const user = JSON.parse(localStorage.getItem('currentUser'));
        let q = attendanceCollection;
        if(user && user.role === 'teacher') q = query(attendanceCollection, where("lecturerId", "==", user.id));

        const snap = await getDocs(q); 
        const dataMap = {}; 
        snap.forEach(docSnap => { 
            const dateOnly = docSnap.data().time.split(' - ')[1]; 
            if(dateOnly) dataMap[dateOnly] = (dataMap[dateOnly] || 0) + 1; 
        }); 
        
        const labels = Object.keys(dataMap).sort(); const dataValues = labels.map(label => dataMap[label]); 
        const ctx = document.getElementById('attendanceChart'); if(!ctx) return; 
        if(attendanceChartInstance) attendanceChartInstance.destroy(); 
        
        attendanceChartInstance = new Chart(ctx, { 
            type: 'line', 
            data: { labels: labels, datasets: [{ label: 'Lượt Check-in', data: dataValues, borderColor: '#4f46e5', backgroundColor: 'rgba(79, 70, 229, 0.1)', borderWidth: 3, tension: 0.4, fill: true, pointBackgroundColor: '#1e3a8a', pointRadius: 6 }] }, 
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } } 
        }); 
    } catch(e) {}
}
document.getElementById('btn-refresh-chart')?.addEventListener('click', renderChart);

// ================= TRA CỨU LỊCH SỬ TỔNG HỢP & FILTER =================
document.getElementById('btn-filter-history')?.addEventListener('click', async () => { 
    const dateInput = document.getElementById('filter-date').value; 
    const classInput = document.getElementById('filter-class').value.trim().toLowerCase(); 
    let searchDate = dateInput ? `${parseInt(dateInput.split('-')[2])}/${parseInt(dateInput.split('-')[1])}/${dateInput.split('-')[0]}` : ""; 
    const tbody = document.getElementById('history-list'); 
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Đang tải...</td></tr>'; 
    
    try { 
        const user = JSON.parse(localStorage.getItem('currentUser'));
        let q = attendanceCollection;
        
        const querySnapshot = await getDocs(q); 
        tbody.innerHTML = ''; let index = 1, hasData = false; 
        
        let docsArray = []; querySnapshot.forEach(doc => docsArray.push(doc.data()));
        docsArray.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));

        docsArray.forEach((item) => { 
            if (user.role === 'teacher' && item.lecturerId !== user.id) return;
            if ((!searchDate || item.time.includes(searchDate)) && (!classInput || item.classCode.toLowerCase().includes(classInput))) { 
                hasData = true; 
                const tr = document.createElement('tr'); 
                tr.innerHTML = `<td>${index++}</td><td style="font-weight:800;">${item.mssv}</td><td style="font-weight:500;">${item.name}</td><td>${item.classCode}</td><td style="color:#64748b;">${item.time}</td><td><span class="badge" style="background:#10b981; color:white;">Hợp lệ</span></td>`; 
                tbody.appendChild(tr); 
            } 
        }); 
        if(!hasData) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: #ef4444; font-weight:bold;">Không tìm thấy dữ liệu!</td></tr>'; 
    } catch (error) {} 
});

// ================= XUẤT EXCEL (ĐÃ SỬA LỖI BẰNG JS SORT) =================
document.getElementById('btn-export-excel')?.addEventListener('click', async () => { 
    try { 
        showToast('Đang xuất Excel...', 'success'); 
        const user = JSON.parse(localStorage.getItem('currentUser'));
        
        // Không dùng orderBy ở query để tránh lỗi Index Firebase, gắp hết data về rồi JS tự sắp xếp.
        let q = attendanceCollection;
        if(user && user.role === 'teacher') q = query(attendanceCollection, where("lecturerId", "==", user.id));

        const snap = await getDocs(q); 
        if(snap.empty) return showToast('Không có dữ liệu để xuất!', 'error');

        // Bỏ data vào mảng để sort thủ công
        let docsArray = [];
        snap.forEach(docSnap => docsArray.push(docSnap.data()));
        docsArray.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));

        let csvContent = "\uFEFFSTT,MSSV,Họ Tên,Mã Lớp,Thời gian Check-in,Trạng thái\n"; 
        let index = 1; 
        
        docsArray.forEach((item) => { 
            csvContent += `${index++},${item.mssv},${item.name.replace(/,/g, " ")},${item.classCode},${item.time},Hợp lệ\n`; 
        }); 
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); 
        const link = document.createElement("a"); link.href = URL.createObjectURL(blob); 
        link.download = `UniCheck_Report_${new Date().getTime()}.csv`; 
        document.body.appendChild(link);
        link.click(); 
        document.body.removeChild(link);
        writeLog(`Xuất Excel file Báo cáo`); 
    } catch (error) { 
        console.error(error);
        showToast('Lỗi khi xuất file!', 'error');
    } 
});

// ================= GIAO DIỆN SÁNG TỐI =================
const body = document.body;

function enableDarkMode() {
    body.classList.add('dark-theme');
    const btnDark = document.getElementById('btn-theme-dark');
    const btnLight = document.getElementById('btn-theme-light');
    if(btnDark && btnLight) {
        btnDark.style.borderColor = 'var(--primary-color)'; btnDark.style.color = 'var(--primary-color)';
        btnLight.style.borderColor = 'var(--border-color)'; btnLight.style.color = 'var(--text-muted)';
    }
}

function disableDarkMode() {
    body.classList.remove('dark-theme');
    const btnDark = document.getElementById('btn-theme-dark');
    const btnLight = document.getElementById('btn-theme-light');
    if(btnDark && btnLight) {
        btnLight.style.borderColor = 'var(--primary-color)'; btnLight.style.color = 'var(--primary-color)';
        btnDark.style.borderColor = 'var(--border-color)'; btnDark.style.color = 'var(--text-muted)';
    }
}

document.getElementById('btn-theme-light')?.addEventListener('click', () => {
    disableDarkMode(); localStorage.setItem('unicheckTheme', 'light');
});

document.getElementById('btn-theme-dark')?.addEventListener('click', () => {
    enableDarkMode(); localStorage.setItem('unicheckTheme', 'dark');
});