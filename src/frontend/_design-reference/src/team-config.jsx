// Team configuration modal
const { useState: useTeamState } = React;

const TEAM_COLORS = ["#7C5CFF","#FF6B6B","#3DBE8B","#FFA94D","#3A86FF","#E76F51","#9A1F66","#F4A300","#5836CC","#0A5C90"];

function TeamConfig({ team, setTeam, onClose }) {
  const [draftName, setDraftName] = useTeamState("");
  const [draftNameTh, setDraftNameTh] = useTeamState("");
  const [draftColor, setDraftColor] = useTeamState(TEAM_COLORS[0]);

  function initialsFrom(name) {
    return name.trim().split(/\s+/).map(w => w[0] || "").join("").slice(0, 2).toUpperCase() || "??";
  }

  function addMember() {
    if (!draftName.trim()) return;
    const id = "m" + Math.random().toString(36).slice(2, 7);
    setTeam(t => ({ ...t, [id]: {
      name: draftName.trim(),
      nameTh: draftNameTh.trim(),
      initials: initialsFrom(draftName),
      color: draftColor,
    }}));
    setDraftName(""); setDraftNameTh("");
    setDraftColor(TEAM_COLORS[(Object.keys(team).length + 1) % TEAM_COLORS.length]);
  }

  function updateMember(id, patch) {
    setTeam(t => ({ ...t, [id]: { ...t[id], ...patch } }));
  }

  function removeMember(id) {
    setTeam(t => {
      const n = { ...t }; delete n[id]; return n;
    });
  }

  return (
    <div className="team-modal-backdrop" onClick={onClose}>
      <div className="team-modal" onClick={(e) => e.stopPropagation()}>
        <header className="team-modal-head">
          <div>
            <h2>ตั้งค่าทีม / Team Configuration</h2>
            <p>เพิ่ม แก้ไข หรือลบสมาชิกในทีมที่จะใช้กำหนด Lead และ Team ของแต่ละ sub-project</p>
          </div>
          <button className="team-close" onClick={onClose}>×</button>
        </header>

        <div className="team-list">
          <div className="team-row team-row-hdr">
            <span>สี</span><span>ชื่อ (EN)</span><span>ชื่อ (TH)</span><span>Initials</span><span></span>
          </div>
          {Object.entries(team).map(([id, p]) => (
            <div className="team-row" key={id}>
              <div className="team-color-wrap">
                <span className="team-avatar" style={{ background: p.color }}>{p.initials}</span>
                <input type="color" value={p.color}
                       onChange={(e) => updateMember(id, { color: e.target.value })} />
              </div>
              <input value={p.name}
                     onChange={(e) => updateMember(id, {
                       name: e.target.value,
                       initials: e.target.value.trim().split(/\s+/).map(w => w[0] || "").join("").slice(0,2).toUpperCase() || p.initials,
                     })}
                     placeholder="ชื่อภาษาอังกฤษ" />
              <input value={p.nameTh}
                     onChange={(e) => updateMember(id, { nameTh: e.target.value })}
                     placeholder="ชื่อภาษาไทย" />
              <input className="team-initials" value={p.initials}
                     maxLength={3}
                     onChange={(e) => updateMember(id, { initials: e.target.value.toUpperCase() })} />
              <button className="team-del" onClick={() => removeMember(id)} title="ลบ">×</button>
            </div>
          ))}
        </div>

        <div className="team-add">
          <div className="team-add-head">+ เพิ่มสมาชิกใหม่ / Add member</div>
          <div className="team-row team-row-add">
            <div className="team-color-wrap">
              <span className="team-avatar" style={{ background: draftColor }}>
                {draftName ? initialsFrom(draftName) : "?"}
              </span>
              <input type="color" value={draftColor}
                     onChange={(e) => setDraftColor(e.target.value)} />
            </div>
            <input value={draftName}
                   onChange={(e) => setDraftName(e.target.value)}
                   onKeyDown={(e) => e.key === "Enter" && addMember()}
                   placeholder="Anan Saetang" />
            <input value={draftNameTh}
                   onChange={(e) => setDraftNameTh(e.target.value)}
                   onKeyDown={(e) => e.key === "Enter" && addMember()}
                   placeholder="อนันต์ แซ่ตั้ง" />
            <span className="team-initials-prev">
              {draftName ? initialsFrom(draftName) : "—"}
            </span>
            <button className="team-add-btn" onClick={addMember}>เพิ่ม</button>
          </div>
        </div>

        <footer className="team-modal-foot">
          <span className="team-count">{Object.keys(team).length} สมาชิก</span>
          <button className="btn-primary" onClick={onClose}>เสร็จสิ้น</button>
        </footer>
      </div>
    </div>
  );
}

window.TeamConfig = TeamConfig;
