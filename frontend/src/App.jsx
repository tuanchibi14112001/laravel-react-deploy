import { useEffect, useState } from "react";
import { userApi } from "./api";
import "./App.css";

const emptyForm = { name: "", email: "", password: "" };

function App() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await userApi.list();
      // API trả về dạng phân trang: { data: [...] }
      setUsers(res.data.data ?? res.data);
    } catch (e) {
      setMessage("Không tải được danh sách user. Kiểm tra backend đã chạy chưa?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setMessage("");
    try {
      if (editingId) {
        const payload = { name: form.name, email: form.email };
        if (form.password) payload.password = form.password;
        await userApi.update(editingId, payload);
        setMessage("Cập nhật user thành công.");
      } else {
        await userApi.create(form);
        setMessage("Tạo user thành công.");
      }
      resetForm();
      loadUsers();
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
      } else {
        setMessage("Có lỗi xảy ra khi lưu user.");
      }
    }
  };

  const handleEdit = (user) => {
    setEditingId(user.id);
    setForm({ name: user.name, email: user.email, password: "" });
    setErrors({});
    setMessage("");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa user này?")) return;
    try {
      await userApi.remove(id);
      setMessage("Xóa user thành công.");
      loadUsers();
    } catch (e) {
      setMessage("Không xóa được user.");
    }
  };

  return (
    <div className="container">
      <h1>Quản lý User</h1>

      {message && <div className="alert">{message}</div>}

      <form className="card form" onSubmit={handleSubmit}>
        <h2>{editingId ? "Sửa user" : "Thêm user mới"}</h2>

        <div className="field">
          <label>Tên</label>
          <input name="name" value={form.name} onChange={handleChange} />
          {errors.name && <span className="error">{errors.name[0]}</span>}
        </div>

        <div className="field">
          <label>Email</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} />
          {errors.email && <span className="error">{errors.email[0]}</span>}
        </div>

        <div className="field">
          <label>Mật khẩu {editingId && "(để trống nếu không đổi)"}</label>
          <input name="password" type="password" value={form.password} onChange={handleChange} />
          {errors.password && <span className="error">{errors.password[0]}</span>}
        </div>

        <div className="actions">
          <button type="submit" className="btn primary">
            {editingId ? "Cập nhật" : "Tạo mới"}
          </button>
          {editingId && (
            <button type="button" className="btn" onClick={resetForm}>
              Hủy
            </button>
          )}
        </div>
      </form>

      <div className="card">
        <h2>Danh sách user</h2>
        {loading ? (
          <p>Đang tải...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Tên</th>
                <th>Email</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="4" className="empty">Chưa có user nào</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <button className="btn small" onClick={() => handleEdit(u)}>
                        Sửa
                      </button>
                      <button className="btn small danger" onClick={() => handleDelete(u.id)}>
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default App;
