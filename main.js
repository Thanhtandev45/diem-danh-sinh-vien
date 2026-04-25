import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, setDoc, getDoc, query, orderBy, serverTimestamp, getDocs, where, deleteDoc, updateDoc, limit } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
const MAX_DISTANCE = 10000; 

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
    var dLat = (lat2-lat1) * (Math.PI/180); var dLon = (lon2-lon1) * (Math.PI/180); 
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; 
}

async function writeLog(actionStr) {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if(!user) return;
    try {
        await addDoc(logsCollection, { email: user.email, role: user.role, action: actionStr, lecturerId: user.id, time: new Date().toLocaleTimeString('vi-VN') + ' - ' + new Date().toLocaleDateString('vi-VN'), timestamp: serverTimestamp() });
    } catch(e) {}
}

window.toggleAuth = function(formType = 'login') {
    document.getElementById('login-form').classList.remove('active'); 
    document.getElementById('register-form').classList.remove('active'); 
    document.getElementById('admin-login-form').classList.remove('active');
    if(formType === 'register') document.getElementById('register-form').classList.add('active');
    else if(formType === 'admin') document.getElementById('admin-login-form').classList.add('active');
    else document.getElementById('login-form').classList.add('active');
}

document.querySelectorAll('.toggle-password').forEach(icon => {
    icon.addEventListener('click', function() {
        const input = this.previousElementSibling;
        if (input.type === 'password') { input.type = 'text'; this.classList.replace('fa-eye', 'fa-eye-slash'); } 
        else { input.type = 'password'; this.classList.replace('fa-eye-slash', 'fa-eye'); }
    });
});

setInterval(() => { const clockElement = document.getElementById('real-time-clock'); if(clockElement) clockElement.textContent = new Date().toLocaleTimeString('vi-VN'); }, 1000);

// ĐĂNG KÝ
document.getElementById('form-register-submit').addEventListener('submit', async function(e) {
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
        if(!(await getDocs(q)).empty) return showToast('Email đã tồn tại!', 'error');
        await addDoc(usersCollection, { email, password: pass, role });
        showToast('Đăng ký thành công!', 'success'); toggleAuth('login'); 
    } catch(err) { showToast('Lỗi hệ thống!', 'error'); }
});

// ĐĂNG NHẬP
document.getElementById('form-login-submit').addEventListener('submit', async function(e) {
    e.preventDefault(); const email = document.getElementById('login-email').value; const pass = document.getElementById('login-password').value;
    try {
        const q = query(usersCollection, where("email", "==", email), where("password", "==", pass)); const snap = await getDocs(q);
        if(snap.empty) return showToast('Sai Email hoặc Mật khẩu!', 'error');
        let userData = {}, userId = ""; snap.forEach(doc => { userData = doc.data(); userId = doc.id; });
        if(userData.role === 'admin') return showToast('Admin vui lòng vào cổng riêng!', 'error');
        localStorage.setItem('currentUser', JSON.stringify({ id: userId, email: userData.email, role: userData.role }));
        showToast(`Đăng nhập thành công!`, 'success'); loadDashboard();
    } catch(err) { showToast('Lỗi Server', 'error'); }
});

document.getElementById('form-admin-login-submit').addEventListener('submit', async function(e) {
    e.preventDefault(); const email = document.getElementById('admin-login-email').value; const pass = document.getElementById('admin-login-password').value;
    try {
        const q = query(usersCollection, where("email", "==", email), where("password", "==", pass)); const snap = await getDocs(q);
        if(snap.empty) return showToast('Xác thực thất bại!', 'error');
        let userData = {}, userId = ""; snap.forEach(doc => { userData = doc.data(); userId = doc.id; });
        if(userData.role !== 'admin') return showToast('Tài khoản không có quyền Admin!', 'error');
        localStorage.setItem('currentUser', JSON.stringify({ id: userId, email: userData.email, role: userData.role }));
        showToast('Truy cập Admin thành công', 'success'); loadDashboard();
    } catch(err) { showToast('Lỗi Server', 'error'); }
});

document.getElementById('btn-logout').addEventListener('click', () => { localStorage.removeItem('currentUser'); location.reload(); });

// ================= PHÂN TÁCH DỮ LIỆU ĐA TẦNG =================
let classUnsubscribe = null;
let attendanceUnsubscribe = null;

function switchPanel(panelId) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(panelId); if(target) target.classList.add('active');
}

function loadDashboard() {
    const user = JSON.parse(localStorage.getItem('currentUser')); if (!user) return;
    document.getElementById('auth-section').classList.add('hidden'); 
    document.getElementById('dashboard-section').classList.remove('hidden');
    document.getElementById('user-display-email').textContent = user.email; 
    document.getElementById('profile-email').textContent = user.email;
    
    const roleSpan = document.getElementById('user-display-role');
    const avatarImgs = document.querySelectorAll('.avatar');
    document.querySelectorAll('.role-all, .role-teacher, .role-admin, .role-student').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.role-all').forEach(el => el.style.display = 'flex');

    if(user.role === 'admin') {
        roleSpan.textContent = 'Quản trị viên';
        avatarImgs.forEach(img => img.src = `https://ui-avatars.com/api/?name=Admin&background=dc3545&color=fff&rounded=true&bold=true`);
        document.querySelectorAll('.role-admin').forEach(el => el.style.display = 'flex');
        switchPanel('admin-panel');
        document.querySelector('[data-target="admin-panel"]').classList.add('active');
        loadAdminUsers(); loadAuditLogs();
    } else if(user.role === 'teacher') {
        roleSpan.textContent = 'Giảng viên';
        avatarImgs.forEach(img => img.src = `https://ui-avatars.com/api/?name=${user.email.charAt(0)}&background=f59e0b&color=fff&rounded=true&bold=true`);
        document.querySelectorAll('.role-teacher').forEach(el => el.style.display = 'flex');
        switchPanel('teacher-panel');
        document.querySelector('[data-target="teacher-panel"]').classList.add('active');
        initTeacherRealtime(user.id);
    } else {
        roleSpan.textContent = 'Sinh viên';
        avatarImgs.forEach(img => img.src = `https://ui-avatars.com/api/?name=${user.email.charAt(0)}&background=4f46e5&color=fff&rounded=true&bold=true`);
        document.querySelectorAll('.role-student').forEach(el => el.style.display = 'flex');
        switchPanel('student-home-panel');
        document.querySelector('[data-target="student-home-panel"]').classList.add('active');
    }
}

// BÔI ĐEN TOÀN BỘ HÀM NÀY VÀ DÁN ĐÈ VÀO MAIN.JS
function initTeacherRealtime(lecturerId) {
    const classStatusRef = doc(db, "classConfigs", lecturerId); 
    const classToggle = document.getElementById('class-toggle');
    const statusText = document.getElementById('class-status-text');
    const teacherClassInput = document.getElementById('teacher-class-code');
    const qrImage = document.getElementById('qr-image');
    const qrArea = document.getElementById('teacher-qr-display');

    if(classUnsubscribe) classUnsubscribe();
    classUnsubscribe = onSnapshot(classStatusRef, (docSnap) => {
        let isActive = false;
        let currentClass = "";

        if (docSnap.exists()) {
            isActive = docSnap.data().isActive === true; // Ép kiểu an toàn tuyệt đối
            currentClass = docSnap.data().classCode || "";
        }

        // Đồng bộ nút gạt
        if(classToggle) classToggle.checked = isActive;
        
        // Đồng bộ Text trạng thái
        if(statusText) { 
            statusText.textContent = isActive ? "ĐANG MỞ CHỜ CHECK-IN" : "ĐÃ ĐÓNG CỔNG"; 
            statusText.style.color = isActive ? "#10b981" : "#ef4444"; 
        }

        // Xử lý mã QR bằng API QuickChart xịn nhất
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
                e.target.checked = false; // Tự gạt tắt đi
                return; 
            }
            
            try {
                await setDoc(classStatusRef, { 
                    isActive: isChecked, 
                    classCode: classCodeValue, 
                    lecturerId: lecturerId 
                });
                showToast(isChecked ? 'Đã mở cổng quét QR!' : 'Đã đóng cổng!', 'success');
                writeLog(isChecked ? `Mở lớp ${classCodeValue}` : "Đóng cổng điểm danh");
            } catch(error) {
                showToast('Lỗi mạng, không thể cập nhật!', 'error');
                e.target.checked = !isChecked; // Revert nếu lỗi
            }
        };
    }
    
    // Tải danh sách điểm danh (Chỉ hiện của mình)
    const q = query(attendanceCollection, where("lecturerId", "==", lecturerId), orderBy("timestamp", "desc"));
    if(attendanceUnsubscribe) attendanceUnsubscribe();
    attendanceUnsubscribe = onSnapshot(q, (snapshot) => {
        const tbody = document.getElementById('attendance-list'); if(!tbody) return; tbody.innerHTML = '';
        const statCheckedIn = document.getElementById('stat-checked-in');
        if(statCheckedIn) statCheckedIn.textContent = snapshot.size;
        
        if(snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#94a3b8; font-style:italic;">Chưa có sinh viên nào Check-in</td></tr>';
            return;
        }

        snapshot.forEach((docSnap) => {
            const item = docSnap.data();
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${tbody.children.length + 1}</td><td style="font-weight:800;">${item.mssv}</td><td>${item.name}</td><td>${item.classCode}</td><td style="color:#64748b;">${item.time}</td><td><span class="badge" style="background:#10b981; color:white;">Hợp lệ</span></td>`;
            tbody.appendChild(tr);
        });
    });
}
// SINH VIÊN ĐIỂM DANH
document.getElementById('form-attendance').addEventListener('submit', function(e) {
    e.preventDefault();
    const qrRaw = document.getElementById('att-class-code').value;
    if(!qrRaw.includes("|")) return showToast('Mã QR không hợp lệ!', 'error');
    const [classCode, lecturerId] = qrRaw.split("|");

    showToast('Kiểm tra GPS...', 'success');
    navigator.geolocation.getCurrentPosition(async (pos) => {
        const dist = getDistanceFromLatLonInM(SCHOOL_LAT, SCHOOL_LON, pos.coords.latitude, pos.coords.longitude);
        if(dist > MAX_DISTANCE) return showToast(`Quá xa trường (${Math.round(dist)}m)!`, 'error');
        
        await addDoc(attendanceCollection, {
            mssv: document.getElementById('att-mssv').value, name: document.getElementById('att-name').value,
            classCode: classCode, lecturerId: lecturerId,
            time: new Date().toLocaleTimeString('vi-VN') + ' - ' + new Date().toLocaleDateString('vi-VN'),
            timestamp: serverTimestamp()
        });
        showToast('Check-in thành công!', 'success'); this.reset();
    }, () => showToast('Hãy bật GPS!', 'error'));
});

// TRA CỨU STREAK (Lọc theo MSSV)
const btnSearchHistory = document.getElementById('btn-search-my-history');
if(btnSearchHistory) {
    btnSearchHistory.onclick = async () => {
        const mssv = document.getElementById('search-my-mssv').value.trim();
        if(!mssv) return showToast('Nhập MSSV!', 'error');
        const q = query(attendanceCollection, where("mssv", "==", mssv));
        const snap = await getDocs(q);
        const tbody = document.getElementById('my-history-list'); tbody.innerHTML = '';
        const uniqueDates = new Set();
        snap.forEach(d => {
            const item = d.data(); uniqueDates.add(item.time.split(' - ')[1]);
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${tbody.children.length + 1}</td><td style="font-weight:800;">${item.classCode}</td><td>${item.time}</td><td><span class="badge" style="background:#10b981; color:white;">Hợp lệ</span></td>`;
            tbody.appendChild(tr);
        });
        document.getElementById('student-streak-count').textContent = uniqueDates.size;
        document.getElementById('streak-container').style.display = uniqueDates.size > 0 ? 'block' : 'none';
    };
}

// MỞ QUÉT QR BẰNG CAMERA
const btnStartScan = document.getElementById('btn-start-scan');
if(btnStartScan) {
    let html5QrcodeScanner;
    btnStartScan.addEventListener('click', () => {
        const qrReaderDiv = document.getElementById('qr-reader');
        if(qrReaderDiv.style.display === 'block') {
            if(html5QrcodeScanner) html5QrcodeScanner.clear(); 
            qrReaderDiv.style.display = 'none';
            btnStartScan.innerHTML = '<i class="fa-solid fa-camera-viewfinder"></i> Bật Camera Quét Mã'; 
        } else {
            qrReaderDiv.style.display = 'block'; 
            btnStartScan.innerHTML = '<i class="fa-solid fa-xmark"></i> Tắt Camera'; 
            html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: {width: 250, height: 250} }, false);
            html5QrcodeScanner.render((decodedText) => {
                document.getElementById('att-class-code').value = decodedText; 
                showToast('Quét mã thành công!', 'success'); 
                html5QrcodeScanner.clear(); 
                qrReaderDiv.style.display = 'none'; 
                btnStartScan.innerHTML = '<i class="fa-solid fa-camera-viewfinder"></i> Bật Camera Quét Mã'; 
            }, () => {});
        }
    });
}

// CÁC HÀM CÀI ĐẶT SIDEBAR & TABS
document.querySelectorAll('.nav-menu li').forEach(li => li.onclick = function() {
    document.querySelectorAll('.nav-menu li').forEach(item => item.classList.remove('active'));
    this.classList.add('active'); switchPanel(this.dataset.target);
    if(this.dataset.target === 'reports-panel') renderChart();
});

document.querySelectorAll('.settings-tabs li').forEach(tab => tab.onclick = function() {
    document.querySelectorAll('.settings-tabs li').forEach(t => t.classList.remove('active'));
    this.classList.add('active');
    document.querySelectorAll('.setting-section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(this.dataset.tab);
    if(target) target.classList.add('active');
});

// DARK MODE
const savedTheme = localStorage.getItem('theme') || 'light';
if(savedTheme === 'dark') document.body.classList.add('dark-theme');
const btnLight = document.getElementById('btn-theme-light');
const btnDark = document.getElementById('btn-theme-dark');
if(btnLight) btnLight.onclick = () => { document.body.classList.remove('dark-theme'); localStorage.setItem('theme', 'light'); };
if(btnDark) btnDark.onclick = () => { document.body.classList.add('dark-theme'); localStorage.setItem('theme', 'dark'); };

// HÀM ADMIN
async function loadAuditLogs() {
    try { 
        const qLog = query(logsCollection, orderBy("timestamp", "desc"), limit(50)); 
        const snap = await getDocs(qLog); 
        const tbody = document.getElementById('admin-audit-list'); 
        if(!tbody) return; tbody.innerHTML = ''; 
        if(snap.empty) return tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#10b981;">Hệ thống sạch. Chưa có log</td></tr>'; 
        snap.forEach(docSnap => { 
            const data = docSnap.data(); const tr = document.createElement('tr'); 
            tr.innerHTML = `<td style="color:#64748b; border:none; border-bottom:1px solid #334155;">${data.time}</td><td style="font-weight:700; color:#818cf8; border:none; border-bottom:1px solid #334155;">${data.email} <span style="font-weight:normal; color:#475569; font-size:11px;">(${data.role})</span></td><td style="color:#cbd5e1; border:none; border-bottom:1px solid #334155;">${data.action}</td>`; 
            tbody.appendChild(tr); 
        }); 
    } catch(e) {}
}

async function loadStudentsList() {
    try { 
        const snap = await getDocs(query(usersCollection, where("role", "==", "student"))); 
        const tbody = document.getElementById('students-roster-list'); 
        if(!tbody) return; tbody.innerHTML = ''; 
        if(snap.empty) return tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Chưa có sinh viên</td></tr>'; 
        let index = 1; 
        snap.forEach(docSnap => { 
            const tr = document.createElement('tr'); 
            tr.innerHTML = `<td>${index++}</td><td style="font-weight:600;">${docSnap.data().email}</td><td><span class="badge" style="background:#64748b; color:white;">Student</span></td>`; 
            tbody.appendChild(tr); 
        }); 
    } catch(e) {}
}

const btnAddStudent = document.getElementById('btn-add-student');
if(btnAddStudent) { 
    btnAddStudent.addEventListener('click', async () => { 
        const email = document.getElementById('add-stu-email').value; const pass = document.getElementById('add-stu-pass').value; 
        if(!email || !pass) return showToast('Nhập đủ trường!', 'error'); 
        try { 
            const q = query(usersCollection, where("email", "==", email)); 
            if(!(await getDocs(q)).empty) return showToast('Tài khoản đã tồn tại!', 'error'); 
            await addDoc(usersCollection, { email, password: pass, role: 'student' }); 
            showToast('Tạo thành công!', 'success'); writeLog(`Tạo sinh viên: ${email}`); 
            document.getElementById('add-stu-email').value = ''; document.getElementById('add-stu-pass').value = ''; 
            loadStudentsList(); 
        } catch(e) {} 
    }); 
}

let attendanceChartInstance = null;
async function renderChart() {
    try { 
        const snap = await getDocs(attendanceCollection); 
        const dataMap = {}; 
        snap.forEach(docSnap => { const dateOnly = docSnap.data().time.split(' - ')[1]; if(dateOnly) dataMap[dateOnly] = (dataMap[dateOnly] || 0) + 1; }); 
        const labels = Object.keys(dataMap).sort(); const dataValues = labels.map(label => dataMap[label]); 
        const ctx = document.getElementById('attendanceChart'); if(!ctx) return; 
        if(attendanceChartInstance) attendanceChartInstance.destroy(); 
        attendanceChartInstance = new Chart(ctx, { type: 'line', data: { labels: labels, datasets: [{ label: 'Lượt Check-in', data: dataValues, borderColor: '#4f46e5', backgroundColor: 'rgba(79, 70, 229, 0.1)', borderWidth: 3, tension: 0.4, fill: true, pointBackgroundColor: '#1e3a8a', pointRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } } }); 
    } catch(e) {}
}
const btnRefreshChart = document.getElementById('btn-refresh-chart'); if(btnRefreshChart) btnRefreshChart.addEventListener('click', renderChart);

async function loadAdminUsers() {
    try { 
        const snap = await getDocs(usersCollection); const tbody = document.getElementById('admin-users-list'); if(!tbody) return; tbody.innerHTML = ''; 
        document.getElementById('admin-total-users').textContent = snap.size; let index = 1; 
        snap.forEach(docSnap => { 
            const data = docSnap.data(); const docId = docSnap.id; 
            let roleBadge = data.role === 'admin' ? '<span class="badge" style="background:linear-gradient(90deg, #dc3545, #991b1b); color:white;">Admin</span>' : (data.role === 'teacher' ? '<span class="badge" style="background:linear-gradient(90deg, #f59e0b, #d97706); color:white;">Giảng viên</span>' : '<span class="badge" style="background:#64748b; color:white;">Sinh viên</span>'); 
            const currentUser = JSON.parse(localStorage.getItem('currentUser')); 
            let actionHtml = (currentUser.id !== docId) ? `<button class="btn btn-danger btn-sm" style="padding:8px; border-radius:6px; font-weight:bold; font-size:12px;" onclick="window.deleteUser('${docId}', '${data.email}')"><i class="fa-solid fa-trash"></i> Xóa</button>` : `<span style="color:#94a3b8; font-size:12px; font-weight:bold;">[MY_ACCOUNT]</span>`; 
            const tr = document.createElement('tr'); tr.innerHTML = `<td>${index++}</td><td style="font-weight:700;">${data.email}</td><td>${roleBadge}</td><td>${actionHtml}</td>`; tbody.appendChild(tr); 
        }); 
    } catch(e) {}
}
window.deleteUser = async function(docId, email) { if(confirm('Xóa tài khoản này vĩnh viễn?')) { try { await deleteDoc(doc(db, "users", docId)); showToast('Đã xóa!', 'success'); writeLog(`Xóa tài khoản: ${email}`); loadAdminUsers(); loadStudentsList(); } catch(e) {} } }

const btnAdminRecoverPass = document.getElementById('btn-admin-recover-pass');
if(btnAdminRecoverPass) { btnAdminRecoverPass.addEventListener('click', async () => { const email = document.getElementById('admin-recover-email').value; const newPass = document.getElementById('admin-recover-pass').value; if(!email || !newPass) return showToast('Nhập đủ thông tin!', 'error'); try { const snap = await getDocs(query(usersCollection, where("email", "==", email))); if(snap.empty) return showToast('Email không tồn tại!', 'error'); await updateDoc(doc(db, "users", snap.docs[0].id), { password: newPass }); showToast(`Cấp lại thành công!`, 'success'); writeLog(`Reset pass cho: ${email}`); document.getElementById('admin-recover-email').value = ''; document.getElementById('admin-recover-pass').value = ''; } catch(e) {} }); }

const btnResetData = document.getElementById('btn-reset-data');
if(btnResetData) { btnResetData.addEventListener('click', async () => { if(confirm('Xóa TOÀN BỘ dữ liệu điểm danh?')) { try { showToast('Đang xóa...', 'success'); const snapshot = await getDocs(attendanceCollection); snapshot.forEach(async (docItem) => await deleteDoc(doc(db, "attendance", docItem.id))); writeLog(`FORMAT DATA`); setTimeout(() => showToast(`Hoàn tất!`, 'success'), 1500); } catch(error) {} } }); }

const btnChangePass = document.getElementById('btn-change-pass'); 
if(btnChangePass) { btnChangePass.addEventListener('click', async () => { const oldPass = document.getElementById('setting-old-pass').value; const newPass = document.getElementById('setting-new-pass').value; const user = JSON.parse(localStorage.getItem('currentUser')); if(!oldPass || !newPass) return showToast('Vui lòng điền đủ!', 'error'); try { const userRef = doc(db, "users", user.id); const userSnap = await getDoc(userRef); if(userSnap.data().password !== oldPass) return showToast('Mật khẩu cũ sai!', 'error'); await updateDoc(userRef, { password: newPass }); showToast('Cập nhật thành công!', 'success'); document.getElementById('setting-old-pass').value=''; document.getElementById('setting-new-pass').value=''; writeLog('Đổi mật khẩu');} catch(e){} }); }

const btnExportExcel = document.getElementById('btn-export-excel');
if(btnExportExcel) { btnExportExcel.addEventListener('click', async () => { try { showToast('Đang xuất Excel...', 'success'); const snap = await getDocs(query(attendanceCollection, orderBy("timestamp", "desc"))); let csvContent = "\uFEFFSTT,MSSV,Họ Tên,Mã Lớp,Thời gian Check-in,Trạng thái\n"; let index = 1; snap.forEach((docSnap) => { const item = docSnap.data(); csvContent += `${index++},${item.mssv},${item.name.replace(/,/g, " ")},${item.classCode},${item.time},${item.status}\n`; }); const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `UniCheck_${new Date().getTime()}.csv`; link.click(); writeLog(`Xuất Excel`); } catch (error) { } }); }

const btnFilterHistory = document.getElementById('btn-filter-history');
if(btnFilterHistory) { btnFilterHistory.addEventListener('click', async () => { const dateInput = document.getElementById('filter-date').value; const classInput = document.getElementById('filter-class').value.trim().toLowerCase(); let searchDate = dateInput ? `${parseInt(dateInput.split('-')[2])}/${parseInt(dateInput.split('-')[1])}/${dateInput.split('-')[0]}` : ""; const tbody = document.getElementById('history-list'); tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Đang tải...</td></tr>'; try { const querySnapshot = await getDocs(collection(db, "attendance")); tbody.innerHTML = ''; let index = 1, hasData = false; querySnapshot.forEach((doc) => { const item = doc.data(); if ((!searchDate || item.time.includes(searchDate)) && (!classInput || item.classCode.toLowerCase().includes(classInput))) { hasData = true; const tr = document.createElement('tr'); tr.innerHTML = `<td>${index++}</td><td style="font-weight:800;">${item.mssv}</td><td style="font-weight:500;">${item.name}</td><td>${item.classCode}</td><td style="color:#64748b;">${item.time}</td><td><span class="badge" style="background:#10b981; color:white;">Hợp lệ</span></td>`; tbody.appendChild(tr); } }); if(!hasData) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: #ef4444; font-weight:bold;">Không tìm thấy dữ liệu!</td></tr>'; } catch (error) {} }); }

if(localStorage.getItem('currentUser')) loadDashboard();