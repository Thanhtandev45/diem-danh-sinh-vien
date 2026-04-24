import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, setDoc, getDoc, query, orderBy, serverTimestamp, getDocs, where, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
        const snap = await getDocs(q);
        if(!snap.empty) return showToast('Email này đã được đăng ký!', 'error');

        await addDoc(usersCollection, { email: email, password: pass, role: role });
        showToast('Đăng ký thành công! Vui lòng đăng nhập.', 'success');
        toggleAuth('login'); 
    } catch(error) { showToast('Lỗi hệ thống khi đăng ký!', 'error'); }
});

document.getElementById('form-login-submit').addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    
    try {
        const q = query(usersCollection, where("email", "==", email), where("password", "==", pass));
        const snap = await getDocs(q);

        if(snap.empty) return showToast('Sai Email hoặc Mật khẩu!', 'error');

        let userData = {}; let userId = "";
        snap.forEach(doc => { userData = doc.data(); userId = doc.id; });

        if(userData.role === 'admin') return showToast('Tài khoản Quản trị vui lòng vào Cổng Admin!', 'error');

        localStorage.setItem('currentUser', JSON.stringify({ id: userId, email: userData.email, role: userData.role }));
        showToast(`Đăng nhập thành công: ${userData.role === 'teacher' ? 'Giảng viên' : 'Sinh viên'}`, 'success');
        loadDashboard();
    } catch(error) { showToast('Lỗi kết nối Server', 'error'); }
});

document.getElementById('form-admin-login-submit').addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('admin-login-email').value;
    const pass = document.getElementById('admin-login-password').value;
    
    try {
        const q = query(usersCollection, where("email", "==", email), where("password", "==", pass));
        const snap = await getDocs(q);

        if(snap.empty) return showToast('Thông tin Quản trị viên không hợp lệ!', 'error');

        let userData = {}; let userId = "";
        snap.forEach(doc => { userData = doc.data(); userId = doc.id; });

        if(userData.role !== 'admin') return showToast('Tài khoản không có quyền Admin!', 'error');

        localStorage.setItem('currentUser', JSON.stringify({ id: userId, email: userData.email, role: userData.role }));
        showToast('Đăng nhập thành công: Quyền Tối Cao', 'success');
        loadDashboard();
    } catch(error) { showToast('Lỗi kết nối Server', 'error'); }
});

document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    location.reload(); 
});

// ================= PHÂN QUYỀN UI & ADMIN VIP =================
function loadDashboard() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;

    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('dashboard-section').classList.remove('hidden');
    document.getElementById('user-display-email').textContent = user.email;
    document.getElementById('user-display-role').textContent = user.role === 'admin' ? 'Admin Tối Cao' : (user.role === 'teacher' ? 'Giảng viên' : 'Sinh viên');

    const sidebar = document.querySelector('.sidebar');
    const topbar = document.querySelector('.topbar');
    const mainContent = document.querySelector('.main-content');
    const studentPanel = document.getElementById('student-panel');

    // MẶC ĐỊNH CHO PHÉP ADMIN VÀ TEACHER
    if (user.role === 'admin' || user.role === 'teacher') {
        document.getElementById('teacher-panel').classList.remove('hidden');
        studentPanel.classList.add('hidden');
        sidebar.style.display = 'block';
        topbar.style.left = '250px';
        topbar.style.width = 'calc(100% - 250px)';
        mainContent.style.marginLeft = '250px';
        studentPanel.classList.remove('student-centered');

        // KIỂM TRA ĐỘC QUYỀN ADMIN
        if (user.role === 'admin') {
            document.getElementById('menu-billing').style.display = 'none'; // Giấu Nâng cấp tài khoản
            document.getElementById('menu-admin').style.display = 'block';  // Hiện menu Quản trị
            loadAdminUsers(); // Tải danh sách tài khoản
        } else {
            document.getElementById('menu-billing').style.display = 'block';
            document.getElementById('menu-admin').style.display = 'none';
        }

    } else {
        // GIAO DIỆN RIÊNG CHO SINH VIÊN
        studentPanel.classList.remove('hidden');
        document.getElementById('teacher-panel').classList.add('hidden');
        sidebar.style.display = 'none';
        topbar.style.left = '0';
        topbar.style.width = '100%';
        mainContent.style.marginLeft = '0';
        studentPanel.classList.add('student-centered'); 
    }
}

// Hàm tải danh sách User cho Admin
async function loadAdminUsers() {
    try {
        const snap = await getDocs(usersCollection);
        const tbody = document.getElementById('admin-users-list');
        if(!tbody) return;
        tbody.innerHTML = '';
        let index = 1;
        document.getElementById('admin-total-users').textContent = snap.size;

        snap.forEach(docSnap => {
            const data = docSnap.data();
            let roleBadge = data.role === 'admin' ? '<span class="badge" style="background:var(--danger-color)">Admin</span>' : 
                            (data.role === 'teacher' ? '<span class="badge" style="background:var(--primary-color)">Giảng viên</span>' : 
                            '<span class="badge" style="background:#888">Sinh viên</span>');
            
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${index++}</td><td style="font-weight:bold">${data.email}</td><td>${roleBadge}</td>`;
            tbody.appendChild(tr);
        });
    } catch(e) { console.error(e); }
}

if(localStorage.getItem('currentUser')) loadDashboard();

// ================= MENU ĐIỀU HƯỚNG =================
document.querySelectorAll('.nav-menu li').forEach(item => {
    item.addEventListener('click', function() {
        const user = JSON.parse(localStorage.getItem('currentUser'));
        if (!user || user.role === 'student') return;

        document.querySelectorAll('.nav-menu li').forEach(li => li.classList.remove('active'));
        this.classList.add('active');

        document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
        
        const targetId = this.getAttribute('data-target');
        if (targetId) document.getElementById(targetId).classList.remove('hidden');
    });
});

// ================= CHỨC NĂNG VIP: XUẤT EXCEL (CSV) =================
const btnExportExcel = document.getElementById('btn-export-excel');
if(btnExportExcel) {
    btnExportExcel.addEventListener('click', async () => {
        try {
            showToast('Đang tạo file Excel...', 'success');
            const qExport = query(attendanceCollection, orderBy("timestamp", "desc"));
            const snap = await getDocs(qExport);
            
            // Thêm \uFEFF ở đầu để Excel nhận diện chuẩn Font Tiếng Việt (BOM)
            let csvContent = "\uFEFFSTT,MSSV,Họ Tên,Mã Lớp,Thời gian,Trạng thái\n";
            let index = 1;

            snap.forEach((docSnap) => {
                const item = docSnap.data();
                // Thay thế dấu phẩy trong tên thành khoảng trắng để tránh lỗi cột CSV
                const safeName = item.name.replace(/,/g, " ");
                csvContent += `${index++},${item.mssv},${safeName},${item.classCode},${item.time},${item.status}\n`;
            });

            // Tạo file và tự động tải về
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `DiemDanh_HocPhan_${new Date().getTime()}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
        } catch (error) {
            console.error(error);
            showToast('Lỗi khi xuất file Excel', 'error');
        }
    });
}

// ================= CHỨC NĂNG VIP: CLEAR DATA (NÚT HẠT NHÂN) =================
const btnResetData = document.getElementById('btn-reset-data');
if(btnResetData) {
    btnResetData.addEventListener('click', async () => {
        const user = JSON.parse(localStorage.getItem('currentUser'));
        if(!user || user.role !== 'admin') return showToast('Từ chối truy cập!', 'error');

        if(confirm('CẢNH BÁO TỐI CAO: Bạn sắp xóa toàn bộ dữ liệu điểm danh của tất cả sinh viên.\nBạn có chắc chắn muốn thực hiện hành động này?')) {
            try {
                showToast('Đang thực hiện xóa dữ liệu...', 'success');
                const snapshot = await getDocs(attendanceCollection);
                let deleteCount = 0;
                
                // Dùng vòng lặp duyệt và xóa từng document trong Firebase
                snapshot.forEach(async (docItem) => {
                    await deleteDoc(doc(db, "attendance", docItem.id));
                    deleteCount++;
                });
                
                setTimeout(() => {
                    showToast(`Đã xóa thành công ${deleteCount} bản ghi điểm danh!`, 'success');
                }, 1500);
            } catch(error) { showToast('Có lỗi xảy ra khi xóa', 'error'); }
        }
    });
}

// ================= CÁC CHỨC NĂNG CÒN LẠI (GIỮ NGUYÊN) =================
async function changePassword(oldPassId, newPassId) {
    const oldPass = document.getElementById(oldPassId).value;
    const newPass = document.getElementById(newPassId).value;
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if(!oldPass || !newPass) return showToast('Vui lòng nhập đủ mật khẩu!', 'error');
    try {
        const userRef = doc(db, "users", user.id);
        const userSnap = await getDoc(userRef);
        if(userSnap.data().password !== oldPass) return showToast('Mật khẩu cũ sai!', 'error');
        await setDoc(userRef, { password: newPass }, { merge: true });
        showToast('Đổi mật khẩu thành công!', 'success');
        document.getElementById(oldPassId).value = ''; document.getElementById(newPassId).value = '';
    } catch(e) { showToast('Lỗi khi đổi mật khẩu', 'error'); }
}
const btnChangePass = document.getElementById('btn-change-pass');
if(btnChangePass) btnChangePass.addEventListener('click', () => changePassword('setting-old-pass', 'setting-new-pass'));
const btnStudentChangePass = document.getElementById('btn-student-change-pass');
if(btnStudentChangePass) btnStudentChangePass.addEventListener('click', () => changePassword('student-old-pass', 'student-new-pass'));

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
        try { await setDoc(classStatusRef, { isActive: this.checked }); showToast(this.checked ? 'Đã MỞ lớp!' : 'Đã ĐÓNG lớp!', this.checked ? 'success' : 'error'); } 
        catch (error) { this.checked = !this.checked; }
    });
}

document.getElementById('form-attendance').addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!isClassCurrentlyActive) return showToast('Lớp chưa mở hoặc đã đóng điểm danh!', 'error');
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
    const checkedInCount = snapshot.size;
    const statCheckedIn = document.getElementById('stat-checked-in');
    const statPercent = document.getElementById('stat-percent');
    if(statCheckedIn) statCheckedIn.textContent = checkedInCount;
    if(statPercent) statPercent.textContent = (checkedInCount > 0 ? Math.round((checkedInCount / 40) * 100) : 0) + '%';

    if (snapshot.empty) return tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Chưa có dữ liệu</td></tr>';
    let index = 1;
    snapshot.forEach((docSnap) => {
        const item = docSnap.data();
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${index++}</td><td>${item.mssv}</td><td>${item.name}</td><td>${item.classCode}</td><td>${item.time}</td><td><span class="badge" style="background:var(--success-color)">${item.status}</span></td>`;
        tbody.appendChild(tr);
    });
});

const btnFilterHistory = document.getElementById('btn-filter-history');
if(btnFilterHistory) {
    btnFilterHistory.addEventListener('click', async () => {
        const dateInput = document.getElementById('filter-date').value; 
        const classInput = document.getElementById('filter-class').value.trim().toLowerCase();
        let searchDate = dateInput ? `${parseInt(dateInput.split('-')[2])}/${parseInt(dateInput.split('-')[1])}/${dateInput.split('-')[0]}` : "";
        const tbody = document.getElementById('history-list'); tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Đang tải...</td></tr>';
        try {
            const querySnapshot = await getDocs(collection(db, "attendance")); tbody.innerHTML = ''; let index = 1, hasData = false;
            querySnapshot.forEach((doc) => {
                const item = doc.data();
                if ((!searchDate || item.time.includes(searchDate)) && (!classInput || item.classCode.toLowerCase().includes(classInput))) {
                    hasData = true; const tr = document.createElement('tr');
                    tr.innerHTML = `<td>${index++}</td><td>${item.mssv}</td><td>${item.name}</td><td>${item.classCode}</td><td>${item.time}</td><td><span class="badge" style="background:var(--success-color)">${item.status}</span></td>`;
                    tbody.appendChild(tr);
                }
            });
            if(!hasData) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: red;">Không tìm thấy dữ liệu!</td></tr>';
        } catch (error) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Lỗi tải dữ liệu.</td></tr>'; }
    });
}

const btnSearchMyHistory = document.getElementById('btn-search-my-history');
if(btnSearchMyHistory) {
    btnSearchMyHistory.addEventListener('click', async () => {
        const mssv = document.getElementById('search-my-mssv').value.trim().toUpperCase(); 
        if(!mssv) return alert('Nhập MSSV!');
        const tbody = document.getElementById('my-history-list'); tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Đang tải...</td></tr>';
        try {
            const querySnapshot = await getDocs(query(collection(db, "attendance"), where("mssv", "==", mssv))); tbody.innerHTML = '';
            if (querySnapshot.empty) return tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: red;">Chưa điểm danh!</td></tr>';
            let index = 1;
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data(); const tr = document.createElement('tr');
                tr.innerHTML = `<td>${index++}</td><td style="font-weight: bold;">${data.classCode}</td><td>${data.time}</td><td><span class="badge" style="background:var(--success-color)">${data.status}</span></td>`;
                tbody.appendChild(tr);
            });
        } catch (error) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Lỗi Server!</td></tr>'; }
    });
}