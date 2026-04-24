// Import các hàm từ thư viện Firebase
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

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Tham chiếu Database
const classStatusRef = doc(db, "settings", "classConfig"); 
const attendanceCollection = collection(db, "attendance"); 
const usersCollection = collection(db, "users"); // Collection mới để lưu Tài khoản

// ================= HỆ THỐNG TOAST =================
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '<i class="fa-solid fa-circle-check"></i>' : '<i class="fa-solid fa-circle-exclamation"></i>';
    toast.innerHTML = `${icon} <span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ================= UI TƯƠNG TÁC =================
window.toggleAuth = function() {
    document.getElementById('login-form').classList.toggle('active');
    document.getElementById('register-form').classList.toggle('active');
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

setInterval(() => {
    const clockElement = document.getElementById('real-time-clock');
    if(clockElement) clockElement.textContent = new Date().toLocaleTimeString('vi-VN');
}, 1000);

// ================= LOGIC ĐĂNG KÝ (LƯU LÊN FIREBASE) =================
document.getElementById('form-register-submit').addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-password').value;
    const confirmPass = document.getElementById('reg-confirm-password').value;
    const role = document.querySelector('input[name="role"]:checked').value;

    if(pass !== confirmPass) {
        return showToast('Mật khẩu xác nhận không khớp!', 'error');
    }

    try {
        // Kiểm tra xem email đã tồn tại chưa
        const q = query(usersCollection, where("email", "==", email));
        const snap = await getDocs(q);
        if(!snap.empty) {
            return showToast('Email này đã được đăng ký!', 'error');
        }

        // Lưu tài khoản mới vào Database
        await addDoc(usersCollection, { email: email, password: pass, role: role });
        showToast('Đăng ký thành công! Vui lòng đăng nhập.', 'success');
        toggleAuth(); // Chuyển sang form đăng nhập
    } catch(error) {
        console.error(error);
        showToast('Lỗi hệ thống khi đăng ký!', 'error');
    }
});

// ================= LOGIC ĐĂNG NHẬP THÔNG MINH =================
document.getElementById('form-login-submit').addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    
    try {
        // Tìm user trong Database có khớp email và mật khẩu không
        const q = query(usersCollection, where("email", "==", email), where("password", "==", pass));
        const snap = await getDocs(q);

        if(snap.empty) {
            return showToast('Sai Email hoặc Mật khẩu!', 'error');
        }

        // Nếu đúng, lấy thông tin và quyền (role) ra
        let userData = {};
        let userId = "";
        snap.forEach(doc => {
            userData = doc.data();
            userId = doc.id;
        });

        // Lưu session vào máy và load trang
        localStorage.setItem('currentUser', JSON.stringify({ id: userId, email: userData.email, role: userData.role }));
        
        let roleName = userData.role === 'admin' ? 'Quản trị viên (Admin)' : (userData.role === 'teacher' ? 'Giảng viên' : 'Sinh viên');
        showToast(`Đăng nhập thành công: ${roleName}`, 'success');
        loadDashboard();

    } catch(error) {
        console.error(error);
        showToast('Lỗi kết nối Server', 'error');
    }
});

document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    document.getElementById('dashboard-section').classList.add('hidden');
    document.getElementById('auth-section').classList.remove('hidden');
    showToast('Đã đăng xuất', 'success');
});

// ================= PHÂN QUYỀN GIAO DIỆN =================
function loadDashboard() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;

    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('dashboard-section').classList.remove('hidden');
    document.getElementById('user-display-email').textContent = user.email;
    
    let roleText = user.role === 'admin' ? 'Admin' : (user.role === 'teacher' ? 'Giảng viên' : 'Sinh viên');
    document.getElementById('user-display-role').textContent = roleText;

    // Phân quyền hiển thị Menu & Panel
    if (user.role === 'admin' || user.role === 'teacher') {
        document.getElementById('teacher-panel').classList.remove('hidden');
        document.getElementById('student-panel').classList.add('hidden');
        
        // Ẩn Vùng Nguy Hiểm nếu chỉ là Giảng viên
        const dangerZone = document.getElementById('admin-danger-zone');
        if(dangerZone) {
            dangerZone.style.display = (user.role === 'admin') ? 'block' : 'none';
        }
    } else {
        // Sinh viên chỉ thấy Panel Sinh viên, ẩn hết sidebar để khỏi bấm lung tung
        document.getElementById('student-panel').classList.remove('hidden');
        document.getElementById('teacher-panel').classList.add('hidden');
        document.querySelector('.sidebar').style.display = 'none';
        document.querySelector('.topbar').style.left = '0';
        document.querySelector('.main-content').style.marginLeft = '0';
    }
}

if(localStorage.getItem('currentUser')) loadDashboard();


// ================= CÀI ĐẶT: ĐỔI MẬT KHẨU =================
document.getElementById('btn-change-pass').addEventListener('click', async () => {
    const oldPass = document.getElementById('setting-old-pass').value;
    const newPass = document.getElementById('setting-new-pass').value;
    const user = JSON.parse(localStorage.getItem('currentUser'));

    if(!oldPass || !newPass) return showToast('Vui lòng nhập đầy đủ thông tin!', 'error');

    try {
        const userRef = doc(db, "users", user.id);
        const userSnap = await getDoc(userRef);
        
        if(userSnap.data().password !== oldPass) {
            return showToast('Mật khẩu cũ không chính xác!', 'error');
        }

        await setDoc(userRef, { password: newPass }, { merge: true });
        showToast('Đổi mật khẩu thành công!', 'success');
        document.getElementById('setting-old-pass').value = '';
        document.getElementById('setting-new-pass').value = '';
    } catch(e) {
        console.error(e);
        showToast('Lỗi khi đổi mật khẩu', 'error');
    }
});

// ================= CÀI ĐẶT: ADMIN RESET LỚP HỌC =================
document.getElementById('btn-reset-data').addEventListener('click', async () => {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if(!user || user.role !== 'admin') {
        return showToast('Từ chối truy cập! Chỉ Admin mới có quyền này.', 'error');
    }

    const isConfirmed = confirm('CẢNH BÁO: BẠN CÓ CHẮC CHẮN MUỐN XÓA TOÀN BỘ DỮ LIỆU ĐIỂM DANH?\nHành động này không thể hoàn tác!');
    if(isConfirmed) {
        try {
            // Lấy toàn bộ document trong bảng attendance và xóa từng cái một
            const snapshot = await getDocs(attendanceCollection);
            snapshot.forEach(async (docItem) => {
                await deleteDoc(doc(db, "attendance", docItem.id));
            });
            showToast('Đã dọn dẹp sạch sẽ toàn bộ dữ liệu lớp học!', 'success');
        } catch(error) {
            console.error(error);
            showToast('Có lỗi xảy ra khi xóa dữ liệu', 'error');
        }
    }
});

// ================= FIREBASE LOGIC: NGHIỆP VỤ ĐIỂM DANH =================
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
        try {
            await setDoc(classStatusRef, { isActive: this.checked });
            showToast(this.checked ? 'Đã MỞ lớp trên Server!' : 'Đã ĐÓNG lớp trên Server!', this.checked ? 'success' : 'error');
        } catch (error) {
            showToast('Không thể kết nối Server', 'error');
            this.checked = !this.checked; 
        }
    });
}

document.getElementById('form-attendance').addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!isClassCurrentlyActive) {
        return showToast('Giảng viên chưa mở lớp hoặc đã đóng điểm danh!', 'error');
    }

    const classCode = document.getElementById('att-class-code').value;
    const mssv = document.getElementById('att-mssv').value;
    const studentName = document.getElementById('att-name').value; 
    const now = new Date();

    try {
        await addDoc(attendanceCollection, {
            mssv: mssv,
            name: studentName, 
            classCode: classCode,
            time: now.toLocaleTimeString('vi-VN') + ' - ' + now.toLocaleDateString('vi-VN'),
            status: "Có mặt",
            timestamp: serverTimestamp()
        });
        showToast('Điểm danh thành công! Dữ liệu đã lên Server.', 'success');
        this.reset();
    } catch (error) {
        showToast('Lỗi khi điểm danh!', 'error');
    }
});

const q = query(attendanceCollection, orderBy("timestamp", "desc")); 
onSnapshot(q, (snapshot) => {
    const tbody = document.getElementById('attendance-list');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    const checkedInCount = snapshot.size;
    const totalStudents = 40; 
    const percent = totalStudents > 0 ? Math.round((checkedInCount / totalStudents) * 100) : 0;

    const statCheckedIn = document.getElementById('stat-checked-in');
    const statPercent = document.getElementById('stat-percent');
    if(statCheckedIn) statCheckedIn.textContent = checkedInCount;
    if(statPercent) statPercent.textContent = percent + '%';

    if (snapshot.empty) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Chưa có sinh viên nào điểm danh</td></tr>';
        return;
    }

    let index = 1;
    snapshot.forEach((docSnap) => {
        const item = docSnap.data();
        const tr = document.createElement('tr');
        tr.style.animation = "fadeIn 0.5s ease";
        tr.innerHTML = `
            <td>${index++}</td>
            <td>${item.mssv}</td>
            <td>${item.name}</td>
            <td>${item.classCode}</td>
            <td>${item.time}</td>
            <td><span class="badge" style="background:var(--success-color)">${item.status}</span></td>
        `;
        tbody.appendChild(tr);
    });
});

// ================= ĐIỀU HƯỚNG MENU SIDEBAR =================
document.querySelectorAll('.nav-menu li').forEach(item => {
    item.addEventListener('click', function() {
        const user = JSON.parse(localStorage.getItem('currentUser'));
        if (!user || user.role === 'student') return;

        document.querySelectorAll('.nav-menu li').forEach(li => li.classList.remove('active'));
        this.classList.add('active');

        document.getElementById('teacher-panel').classList.add('hidden');
        document.getElementById('settings-panel').classList.add('hidden');
        document.getElementById('history-panel').classList.add('hidden'); 
        document.getElementById('billing-panel').classList.add('hidden'); 

        const menuText = this.textContent.trim();
        if (menuText === 'Trang chủ') document.getElementById('teacher-panel').classList.remove('hidden');
        else if (menuText === 'Cài đặt') document.getElementById('settings-panel').classList.remove('hidden');
        else if (menuText === 'Lịch sử') document.getElementById('history-panel').classList.remove('hidden');
        else if (menuText === 'Tài khoản') document.getElementById('billing-panel').classList.remove('hidden');
    });
});

// ================= LOGIC TÌM KIẾM LỊCH SỬ (GIẢNG VIÊN) =================
const btnFilterHistory = document.getElementById('btn-filter-history');
if(btnFilterHistory) {
    btnFilterHistory.addEventListener('click', async () => {
        const dateInput = document.getElementById('filter-date').value; 
        const classInput = document.getElementById('filter-class').value.trim().toLowerCase();
        let searchDate = "";
        if(dateInput) {
            const [year, month, day] = dateInput.split('-');
            searchDate = `${parseInt(day)}/${parseInt(month)}/${year}`; 
        }

        const tbody = document.getElementById('history-list');
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Đang tải dữ liệu <i class="fa-solid fa-spinner fa-spin"></i></td></tr>';

        try {
            const querySnapshot = await getDocs(collection(db, "attendance"));
            tbody.innerHTML = '';
            let index = 1;
            let hasData = false;

            querySnapshot.forEach((doc) => {
                const item = doc.data();
                const matchDate = searchDate ? item.time.includes(searchDate) : true;
                const matchClass = classInput ? item.classCode.toLowerCase().includes(classInput) : true;

                if (matchDate && matchClass) {
                    hasData = true;
                    const tr = document.createElement('tr');
                    tr.style.animation = "fadeIn 0.5s ease";
                    tr.innerHTML = `
                        <td>${index++}</td>
                        <td>${item.mssv}</td>
                        <td>${item.name}</td>
                        <td>${item.classCode}</td>
                        <td>${item.time}</td>
                        <td><span class="badge" style="background:var(--success-color)">${item.status}</span></td>
                    `;
                    tbody.appendChild(tr);
                }
            });

            if(!hasData) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--danger-color);">Không tìm thấy dữ liệu điểm danh nào phù hợp!</td></tr>';
            else showToast('Đã tải xong dữ liệu lịch sử!', 'success');
        } catch (error) {
            showToast('Lỗi khi tải dữ liệu từ Server', 'error');
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Có lỗi xảy ra, vui lòng thử lại sau.</td></tr>';
        }
    });
}

// ================= TRA CỨU LỊCH SỬ SINH VIÊN =================
const btnSearchMyHistory = document.getElementById('btn-search-my-history');
if(btnSearchMyHistory) {
    btnSearchMyHistory.addEventListener('click', async () => {
        const mssv = document.getElementById('search-my-mssv').value.trim().toUpperCase(); 
        if(!mssv) return alert('Vui lòng nhập MSSV để tra cứu!');

        const tbody = document.getElementById('my-history-list');
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Đang tải dữ liệu <i class="fa-solid fa-spinner fa-spin"></i></td></tr>';

        try {
            const qStudent = query(collection(db, "attendance"), where("mssv", "==", mssv));
            const querySnapshot = await getDocs(qStudent);

            tbody.innerHTML = '';
            if (querySnapshot.empty) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--danger-color);">Bạn chưa điểm danh buổi nào!</td></tr>';
                return;
            }

            let index = 1;
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${index++}</td>
                    <td style="font-weight: bold;">${data.classCode}</td>
                    <td>${data.time}</td>
                    <td><span class="badge" style="background:var(--success-color)">${data.status}</span></td>
                `;
                tbody.appendChild(tr);
            });
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--danger-color);">Lỗi kết nối Server!</td></tr>';
        }
    });
}