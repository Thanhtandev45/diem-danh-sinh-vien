import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, setDoc, getDoc, query, orderBy, serverTimestamp, getDocs, where, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '<i class="fa-solid fa-circle-check"></i>' : '<i class="fa-solid fa-circle-exclamation"></i>';
    toast.innerHTML = `${icon} <span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
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

setInterval(() => {
    const clockElement = document.getElementById('real-time-clock');
    if(clockElement) clockElement.textContent = new Date().toLocaleTimeString('vi-VN');
}, 1000);

// ================= AUTH LOGIC =================
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
        showToast('Đăng ký thành công!', 'success'); toggleAuth('login'); 
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
        showToast(`Đăng nhập thành công!`, 'success'); loadDashboard();
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
        showToast('Truy cập Admin thành công', 'success'); loadDashboard();
    } catch(err) { showToast('Lỗi Server', 'error'); }
});

document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('currentUser'); location.reload(); 
});

// ================= PHÂN QUYỀN VÀ MENU =================
function loadDashboard() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;

    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('dashboard-section').classList.remove('hidden');
    document.getElementById('user-display-email').textContent = user.email;
    document.getElementById('user-display-role').textContent = user.role === 'admin' ? 'Admin' : (user.role === 'teacher' ? 'Giảng viên' : 'Sinh viên');

    if (user.role === 'admin' || user.role === 'teacher') {
        document.getElementById('teacher-panel').classList.remove('hidden');
        document.getElementById('student-panel').classList.add('hidden');
        document.querySelector('.sidebar').style.display = 'block';
        document.querySelector('.topbar').style.left = '250px';
        document.querySelector('.topbar').style.width = 'calc(100% - 250px)';
        document.querySelector('.main-content').style.marginLeft = '250px';

        if (user.role === 'admin') {
            document.getElementById('menu-admin').style.display = 'block';
            loadAdminUsers();
        } else {
            document.getElementById('menu-admin').style.display = 'none';
        }
        loadStudentsList(); 
    } else {
        document.getElementById('student-panel').classList.remove('hidden');
        document.getElementById('teacher-panel').classList.add('hidden');
        document.querySelector('.sidebar').style.display = 'none';
        document.querySelector('.topbar').style.left = '0';
        document.querySelector('.topbar').style.width = '100%';
        document.querySelector('.main-content').style.marginLeft = '0';
        document.getElementById('student-panel').classList.add('student-centered'); 
    }
}

if(localStorage.getItem('currentUser')) loadDashboard();

document.querySelectorAll('.nav-menu li').forEach(item => {
    item.addEventListener('click', function() {
        const user = JSON.parse(localStorage.getItem('currentUser'));
        if (!user || user.role === 'student') return;

        document.querySelectorAll('.nav-menu li').forEach(li => li.classList.remove('active'));
        this.classList.add('active');
        document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
        
        const targetId = this.getAttribute('data-target');
        if (targetId) document.getElementById(targetId).classList.remove('hidden');

        // Render chart khi bấm vào Menu Báo Cáo
        if(targetId === 'reports-panel') renderChart();
    });
});

// ================= TÍNH NĂNG 1: QUẢN LÝ SINH VIÊN =================
async function loadStudentsList() {
    try {
        const snap = await getDocs(query(usersCollection, where("role", "==", "student")));
        const tbody = document.getElementById('students-roster-list');
        if(!tbody) return; tbody.innerHTML = '';
        if(snap.empty) return tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Chưa có sinh viên nào trong hệ thống</td></tr>';
        
        let index = 1;
        snap.forEach(docSnap => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${index++}</td><td>${docSnap.data().email}</td><td><span class="badge" style="background:#888">Sinh viên</span></td>`;
            tbody.appendChild(tr);
        });
    } catch(e) { console.error(e); }
}

const btnAddStudent = document.getElementById('btn-add-student');
if(btnAddStudent) {
    btnAddStudent.addEventListener('click', async () => {
        const email = document.getElementById('add-stu-email').value;
        const pass = document.getElementById('add-stu-pass').value;
        if(!email || !pass) return showToast('Vui lòng nhập đủ thông tin!', 'error');
        
        try {
            const q = query(usersCollection, where("email", "==", email));
            if(!(await getDocs(q)).empty) return showToast('Email đã tồn tại!', 'error');
            await addDoc(usersCollection, { email, password: pass, role: 'student' });
            showToast('Đã thêm sinh viên thành công!', 'success');
            document.getElementById('add-stu-email').value = ''; document.getElementById('add-stu-pass').value = '';
            loadStudentsList();
        } catch(e) { showToast('Lỗi khi thêm sinh viên', 'error'); }
    });
}

// ================= TÍNH NĂNG 2: BIỂU ĐỒ THỐNG KÊ (CHART.JS) =================
let attendanceChartInstance = null;
async function renderChart() {
    try {
        const snap = await getDocs(attendanceCollection);
        const dataMap = {};
        
        // Gom nhóm dữ liệu theo ngày (Bỏ phần giờ đi)
        snap.forEach(docSnap => {
            const timeStr = docSnap.data().time; 
            const dateOnly = timeStr.split(' - ')[1]; // Lấy phần ngày
            if(dateOnly) {
                dataMap[dateOnly] = (dataMap[dateOnly] || 0) + 1;
            }
        });

        // Sắp xếp ngày tăng dần
        const labels = Object.keys(dataMap).sort();
        const dataValues = labels.map(label => dataMap[label]);

        const ctx = document.getElementById('attendanceChart');
        if(!ctx) return;
        
        if(attendanceChartInstance) attendanceChartInstance.destroy(); // Xóa biểu đồ cũ nếu có

        attendanceChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Số lượt sinh viên điểm danh',
                    data: dataValues,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    borderWidth: 3,
                    tension: 0.3,
                    fill: true,
                    pointBackgroundColor: '#1e3a8a',
                    pointRadius: 5
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
    } catch(e) { console.log('Lỗi vẽ biểu đồ', e); }
}

const btnRefreshChart = document.getElementById('btn-refresh-chart');
if(btnRefreshChart) btnRefreshChart.addEventListener('click', renderChart);

// ================= TÍNH NĂNG 3: ADMIN VIP FEATURES =================
// 3.1 Load danh sách Admin & Cho phép Xóa
async function loadAdminUsers() {
    try {
        const snap = await getDocs(usersCollection);
        const tbody = document.getElementById('admin-users-list');
        if(!tbody) return; tbody.innerHTML = '';
        document.getElementById('admin-total-users').textContent = snap.size;

        let index = 1;
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const docId = docSnap.id;
            let roleBadge = data.role === 'admin' ? '<span class="badge" style="background:var(--danger-color)">Admin</span>' : 
                            (data.role === 'teacher' ? '<span class="badge" style="background:var(--primary-color)">Giảng viên</span>' : 
                            '<span class="badge" style="background:#888">Sinh viên</span>');
            
            // Nút xóa chỉ hiện với người khác, Admin không tự xóa mình
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            let actionHtml = (currentUser.id !== docId) ? 
                `<button class="btn btn-danger btn-sm" onclick="window.deleteUser('${docId}')"><i class="fa-solid fa-trash"></i> Xóa</button>` : 
                `<span style="color:#aaa; font-size:12px;">(Bạn)</span>`;

            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${index++}</td><td style="font-weight:bold">${data.email}</td><td>${roleBadge}</td><td>${actionHtml}</td>`;
            tbody.appendChild(tr);
        });
    } catch(e) { console.error(e); }
}

window.deleteUser = async function(docId) {
    if(confirm('Bạn có chắc chắn muốn XÓA VĨNH VIỄN tài khoản này?')) {
        try {
            await deleteDoc(doc(db, "users", docId));
            showToast('Đã xóa tài khoản!', 'success');
            loadAdminUsers();
            loadStudentsList();
        } catch(e) { showToast('Lỗi khi xóa!', 'error'); }
    }
}

// 3.2 Cấp lại mật khẩu (Admin)
const btnAdminRecoverPass = document.getElementById('btn-admin-recover-pass');
if(btnAdminRecoverPass) {
    btnAdminRecoverPass.addEventListener('click', async () => {
        const email = document.getElementById('admin-recover-email').value;
        const newPass = document.getElementById('admin-recover-pass').value;
        
        if(!email || !newPass) return showToast('Vui lòng nhập Email và Mật khẩu mới!', 'error');
        
        try {
            const q = query(usersCollection, where("email", "==", email));
            const snap = await getDocs(q);
            if(snap.empty) return showToast('Không tìm thấy Email này trong hệ thống!', 'error');
            
            // Lấy ID của user đó và cập nhật pass
            const targetDocId = snap.docs[0].id;
            await updateDoc(doc(db, "users", targetDocId), { password: newPass });
            
            showToast(`Đã cấp mật khẩu mới cho ${email}!`, 'success');
            document.getElementById('admin-recover-email').value = '';
            document.getElementById('admin-recover-pass').value = '';
        } catch(e) { showToast('Lỗi khi đổi mật khẩu!', 'error'); }
    });
}

// 3.3 Hủy diệt Lớp học (Đã có)
const btnResetData = document.getElementById('btn-reset-data');
if(btnResetData) {
    btnResetData.addEventListener('click', async () => {
        if(confirm('CẢNH BÁO TỐI CAO: Xóa toàn bộ dữ liệu điểm danh?')) {
            try {
                showToast('Đang thực hiện xóa...', 'success');
                const snapshot = await getDocs(attendanceCollection);
                snapshot.forEach(async (docItem) => await deleteDoc(doc(db, "attendance", docItem.id)));
                setTimeout(() => showToast(`Đã dọn dẹp sạch sẽ!`, 'success'), 1500);
            } catch(error) { showToast('Lỗi khi xóa', 'error'); }
        }
    });
}

// ================= CÁC TÍNH NĂNG CHUNG CŨ =================
async function changePassword(oldPassId, newPassId) {
    const oldPass = document.getElementById(oldPassId).value;
    const newPass = document.getElementById(newPassId).value;
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if(!oldPass || !newPass) return showToast('Vui lòng nhập đủ mật khẩu!', 'error');
    try {
        const userRef = doc(db, "users", user.id);
        const userSnap = await getDoc(userRef);
        if(userSnap.data().password !== oldPass) return showToast('Mật khẩu cũ sai!', 'error');
        await updateDoc(userRef, { password: newPass });
        showToast('Đổi mật khẩu thành công!', 'success');
        document.getElementById(oldPassId).value = ''; document.getElementById(newPassId).value = '';
    } catch(e) { showToast('Lỗi khi đổi mật khẩu', 'error'); }
}
const btnChangePass = document.getElementById('btn-change-pass');
if(btnChangePass) btnChangePass.addEventListener('click', () => changePassword('setting-old-pass', 'setting-new-pass'));
const btnStudentChangePass = document.getElementById('btn-student-change-pass');
if(btnStudentChangePass) btnStudentChangePass.addEventListener('click', () => changePassword('student-old-pass', 'student-new-pass'));

const btnExportExcel = document.getElementById('btn-export-excel');
if(btnExportExcel) {
    btnExportExcel.addEventListener('click', async () => {
        try {
            showToast('Đang tạo file Excel...', 'success');
            const snap = await getDocs(query(attendanceCollection, orderBy("timestamp", "desc")));
            let csvContent = "\uFEFFSTT,MSSV,Họ Tên,Mã Lớp,Thời gian,Trạng thái\n";
            let index = 1;
            snap.forEach((docSnap) => {
                const item = docSnap.data();
                csvContent += `${index++},${item.mssv},${item.name.replace(/,/g, " ")},${item.classCode},${item.time},${item.status}\n`;
            });
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
            link.download = `DiemDanh_${new Date().getTime()}.csv`;
            link.click();
        } catch (error) { showToast('Lỗi xuất Excel', 'error'); }
    });
}

// Logic Điểm danh & Toggle Lớp
const classToggle = document.getElementById('class-toggle');
const statusText = document.getElementById('class-status-text');
let isClassCurrentlyActive = false; 
onSnapshot(classStatusRef, (docSnap) => {
    if (docSnap.exists()) {
        isClassCurrentlyActive = docSnap.data().isActive;
        if(classToggle) classToggle.checked = isClassCurrentlyActive;
        if(statusText) {
            statusText.textContent = isClassCurrentlyActive ? "Đang mở" : "Đã đóng";
            statusText.className = isClassCurrentlyActive ? "status-open" : "status-closed";
        }
    }
});
if(classToggle) {
    classToggle.addEventListener('change', async function() {
        try { await setDoc(classStatusRef, { isActive: this.checked }); showToast(this.checked ? 'Đã MỞ lớp!' : 'Đã ĐÓNG lớp!', 'success'); } 
        catch (error) { this.checked = !this.checked; }
    });
}
document.getElementById('form-attendance').addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!isClassCurrentlyActive) return showToast('Lớp chưa mở điểm danh!', 'error');
    try {
        await addDoc(attendanceCollection, {
            mssv: document.getElementById('att-mssv').value, name: document.getElementById('att-name').value, 
            classCode: document.getElementById('att-class-code').value, time: new Date().toLocaleTimeString('vi-VN') + ' - ' + new Date().toLocaleDateString('vi-VN'),
            status: "Có mặt", timestamp: serverTimestamp()
        });
        showToast('Điểm danh thành công!', 'success'); this.reset();
    } catch (error) { showToast('Lỗi khi điểm danh!', 'error'); }
});

const q = query(attendanceCollection, orderBy("timestamp", "desc")); 
onSnapshot(q, (snapshot) => {
    const tbody = document.getElementById('attendance-list');
    if(!tbody) return; tbody.innerHTML = '';
    const statCheckedIn = document.getElementById('stat-checked-in');
    const statPercent = document.getElementById('stat-percent');
    if(statCheckedIn) statCheckedIn.textContent = snapshot.size;
    if(statPercent) statPercent.textContent = (snapshot.size > 0 ? Math.round((snapshot.size / 40) * 100) : 0) + '%';

    if (snapshot.empty) return tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Chưa có dữ liệu</td></tr>';
    let index = 1;
    snapshot.forEach((docSnap) => {
        const item = docSnap.data(); const tr = document.createElement('tr');
        tr.innerHTML = `<td>${index++}</td><td>${item.mssv}</td><td>${item.name}</td><td>${item.classCode}</td><td>${item.time}</td><td><span class="badge" style="background:var(--success-color)">${item.status}</span></td>`;
        tbody.appendChild(tr);
    });
});