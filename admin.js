(() => {
  const API = ((window.ABADIR_CONFIG || {}).API_BASE || "").replace(/\/$/, "");
  const $ = id => document.getElementById(id);
  const loginPanel=$("loginPanel"), dashboard=$("dashboard"), loginForm=$("loginForm");
  const tokenKey="abadirAdminToken";
  let students=[];
  const message=(el,text,error=false)=>{el.textContent=text;el.classList.toggle("error",error);};
  async function request(path, options={}) {
    if(!API) throw new Error("API_BASE is not configured in config.js.");
    const headers={"Content-Type":"application/json",...(options.headers||{})};
    const token=sessionStorage.getItem(tokenKey);
    if(token) headers.Authorization=`Bearer ${token}`;
    const r=await fetch(API+path,{...options,headers});
    const data=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(data.error||data.message||`Request failed (${r.status})`);
    return data;
  }
  async function checkApi(){
    try{await request("/api/health");$("apiStatus").textContent="Connected";}
    catch{$("apiStatus").textContent="Unavailable";}
  }
  function showDashboard(){
    loginPanel.hidden=true;dashboard.hidden=false;
    checkApi();loadStudents();
  }
  async function loadStudents(){
    $("tableMsg").textContent="Loading students…";
    try{
      const data=await request("/api/students");
      students=Array.isArray(data)?data:(data.students||[]);
      $("studentCount").textContent=students.length;
      render();
      $("tableMsg").textContent=students.length?"":"No student registrations found.";
    }catch(e){
      message($("tableMsg"),e.message+" Ensure the updated backend is deployed.",true);
      if(/unauthorized|token|401/i.test(e.message)) logout();
    }
  }
  function render(){
    const q=$("search").value.trim().toLowerCase();
    const rows=students.filter(s=>[s.fullName,s.full_name,s.phone,s.email,s.course].some(v=>String(v||"").toLowerCase().includes(q)));
    $("studentRows").replaceChildren();
    rows.forEach(s=>{
      const tr=document.createElement("tr");
      const vals=[s.fullName||s.full_name||"",s.phone||"",s.email||"",s.course||"",s.createdAt||s.created_at||""];
      vals.forEach((v,i)=>{const td=document.createElement("td");td.textContent=i===4&&v?new Date(v).toLocaleDateString():(v||"—");tr.appendChild(td);});
      const actions=document.createElement("td");
      const edit=document.createElement("button");edit.className="action-btn";edit.textContent="Edit";edit.onclick=()=>openEdit(s);
      const del=document.createElement("button");del.className="action-btn delete-btn";del.textContent="Delete";del.onclick=()=>deleteStudent(s);
      actions.append(edit,del);tr.appendChild(actions);$("studentRows").appendChild(tr);
    });
  }
  loginForm.addEventListener("submit",async e=>{
    e.preventDefault();const btn=loginForm.querySelector("button");btn.disabled=true;
    message($("loginMsg"),"Signing in…");
    try{
      const data=await request("/api/admin/login",{method:"POST",headers:{},body:JSON.stringify({username:$("username").value.trim(),password:$("password").value})});
      if(!data.token) throw new Error("Backend did not return a login token.");
      sessionStorage.setItem(tokenKey,data.token);$("password").value="";showDashboard();
    }catch(err){message($("loginMsg"),err.message,true);}
    finally{btn.disabled=false;}
  });
  function logout(){sessionStorage.removeItem(tokenKey);dashboard.hidden=true;loginPanel.hidden=false;}
  $("logoutBtn").onclick=logout;$("search").addEventListener("input",render);
  function openEdit(s){
    $("editId").value=s.id;$("editName").value=s.fullName||s.full_name||"";$("editPhone").value=s.phone||"";
    $("editEmail").value=s.email||"";$("editCourse").value=s.course||"";
    $("editMsg").textContent="";$("editDialog").showModal();
  }
  $("cancelEdit").onclick=()=>$("editDialog").close();
  $("editForm").addEventListener("submit",async e=>{
    e.preventDefault();const id=$("editId").value;
    try{
      await request("/api/students/"+encodeURIComponent(id),{method:"PUT",body:JSON.stringify({fullName:$("editName").value.trim(),phone:$("editPhone").value.trim(),email:$("editEmail").value.trim(),course:$("editCourse").value.trim()})});
      $("editDialog").close();await loadStudents();
    }catch(err){message($("editMsg"),err.message,true);}
  });
  async function deleteStudent(s){
    if(!confirm(`Delete registration for ${s.fullName||s.full_name||"this student"}?`))return;
    try{await request("/api/students/"+encodeURIComponent(s.id),{method:"DELETE"});await loadStudents();}
    catch(e){message($("tableMsg"),e.message,true);}
  }
  if(sessionStorage.getItem(tokenKey)) showDashboard();
})();