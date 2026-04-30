import { createClient } from '@supabase/supabase-js';
const url = 'https://npfxypgxktxpmaairkmj.supabase.co';
const sb = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false }});

const users = [
  { email: 'gestor@demo.com', full_name: 'Dra. Ana Gestora', role: 'gestor' },
  { email: 'hemo@demo.com', full_name: 'Dr. Carlos Hemoterapeuta', role: 'hemoterapeuta' },
  { email: 'bio@demo.com', full_name: 'Dra. Beatriz Biomédica', role: 'biomedico' },
  { email: 'tec@demo.com', full_name: 'Tiago Técnico', role: 'tecnico' },
  { email: 'enf@demo.com', full_name: 'Enf. Eduarda Silva', role: 'enfermeiro' },
  { email: 'med@demo.com', full_name: 'Dr. Marcos Médico', role: 'medico' },
];
const ids = {};
for (const u of users) {
  let userId;
  const { data, error } = await sb.auth.admin.createUser({
    email: u.email, password: 'Demo@2026!', email_confirm: true,
    user_metadata: { full_name: u.full_name }
  });
  if (error) {
    const { data: list } = await sb.auth.admin.listUsers({ perPage: 200 });
    userId = list.users.find(x => x.email === u.email)?.id;
  } else userId = data.user.id;
  ids[u.role] = userId;
  await sb.from('profiles').update({ full_name: u.full_name, active: true }).eq('id', userId);
  await sb.from('user_roles').upsert({ user_id: userId, role: u.role }, { onConflict: 'user_id,role' });
  console.log('✓', u.email, userId);
}

// Patients
const patients = [
  { mrn:'MRN-001', full_name:'João da Silva', cpf:'111.222.333-44', birth_date:'1965-03-12', blood_type:'A_POS', blood_type_confirmed:true, irradiation_required:true },
  { mrn:'MRN-002', full_name:'Maria Oliveira', cpf:'222.333.444-55', birth_date:'1972-07-21', blood_type:'O_NEG', blood_type_confirmed:true },
  { mrn:'MRN-003', full_name:'Pedro Santos', cpf:'333.444.555-66', birth_date:'1958-11-03', blood_type:'B_POS', blood_type_confirmed:true, alerts:'Histórico de reação febril' },
  { mrn:'MRN-004', full_name:'Ana Costa', cpf:'444.555.666-77', birth_date:'1990-05-18', blood_type:'AB_POS', blood_type_confirmed:true, cmv_negative_required:true },
  { mrn:'MRN-005', full_name:'Carlos Mendes', cpf:'555.666.777-88', birth_date:'1981-02-09', blood_type:'O_POS', blood_type_confirmed:true },
  { mrn:'MRN-006', full_name:'Juliana Pereira', cpf:'666.777.888-99', birth_date:'1995-09-25', blood_type:'A_NEG', blood_type_confirmed:true, pai_status:'positivo', pai_antibodies:'Anti-D' },
  { mrn:'MRN-007', full_name:'Roberto Lima', cpf:'777.888.999-00', birth_date:'1948-12-30', blood_type:'B_NEG', blood_type_confirmed:true, irradiation_required:true, cmv_negative_required:true },
  { mrn:'MRN-008', full_name:'Fernanda Souza', cpf:'888.999.000-11', birth_date:'1987-04-14', blood_type:'O_POS', blood_type_confirmed:true },
  { mrn:'MRN-009', full_name:'Lucas Almeida', cpf:'999.000.111-22', birth_date:'2002-08-07', blood_type:'NAO_TIPADO', blood_type_confirmed:false },
  { mrn:'MRN-010', full_name:'Patrícia Rocha', cpf:'000.111.222-33', birth_date:'1969-06-22', blood_type:'AB_NEG', blood_type_confirmed:true },
];
const upRes = await sb.from('patients').upsert(patients, { onConflict:'mrn' }).select();
if (upRes.error) console.log('patients err', upRes.error);
const { data: pats } = await sb.from('patients').select('*').in('mrn', patients.map(p=>p.mrn));
console.log('✓ patients', pats?.length);

// Blood units
const today = new Date();
const day = (d) => { const x = new Date(today); x.setDate(x.getDate()+d); return x.toISOString().slice(0,10); };
const components = ['CH','CP','PFC','CRIO'];
const types = ['O_NEG','O_POS','A_NEG','A_POS','B_NEG','B_POS','AB_NEG','AB_POS'];
const units = [];
let n = 1;
for (const c of components) {
  for (const t of types) {
    const count = Math.floor(Math.random()*4) + (t === 'O_POS' ? 2 : 0);
    for (let i = 0; i < count; i++) {
      units.push({
        bag_number: `ISBT-${c}-${t}-${String(n).padStart(4,'0')}`,
        component_type: c, blood_type: t,
        volume_ml: c==='CH'?300:c==='PFC'?220:c==='CP'?60:30,
        expiration_date: day(Math.random() < 0.1 ? 1 : Math.random()<0.2 ? 5 : 25 + Math.floor(Math.random()*15)),
        donation_number: `DOA-${1000+n}`,
        irradiated: Math.random()<0.3, filtered: Math.random()<0.5,
        cmv_negative: Math.random()<0.3, phenotyped: false,
        status: 'disponivel', location: `Geladeira ${1+(n%3)}`,
        received_by: ids.tecnico,
      });
      n++;
    }
  }
}
const { error: ue } = await sb.from('blood_units').insert(units);
console.log('✓ units', units.length, ue?.message ?? '');

// Requests
const reqs = [
  { patient_id: pats[0].id, requesting_physician_id: ids.medico, component_type:'CH', quantity:2, urgency:'rotina', clinical_indication:'Anemia pré-operatória', diagnosis:'Cirurgia eletiva de quadril', current_hb:7.8, current_ht:24.0, status:'pendente' },
  { patient_id: pats[1].id, requesting_physician_id: ids.medico, component_type:'CH', quantity:1, urgency:'urgencia', clinical_indication:'Hemorragia digestiva', diagnosis:'Úlcera péptica sangrando', current_hb:6.2, current_ht:19.0, status:'em_analise' },
  { patient_id: pats[2].id, requesting_physician_id: ids.medico, component_type:'CP', quantity:1, urgency:'rotina', clinical_indication:'Plaquetopenia pós-quimioterapia', diagnosis:'LMA em quimio', platelet_count:18000, status:'pendente' },
  { patient_id: pats[3].id, requesting_physician_id: ids.medico, component_type:'CH', quantity:2, urgency:'emergencia_absoluta', clinical_indication:'Politrauma', diagnosis:'Acidente automobilístico', current_hb:5.1, status:'em_analise', emergency_justification:'Choque hemorrágico classe IV' },
  { patient_id: pats[4].id, requesting_physician_id: ids.medico, component_type:'PFC', quantity:2, urgency:'rotina', clinical_indication:'Coagulopatia hepática', diagnosis:'Cirrose Child C', status:'pronto_dispensar' },
  { patient_id: pats[5].id, requesting_physician_id: ids.medico, component_type:'CH', quantity:1, urgency:'urgencia', clinical_indication:'Anemia falciforme em crise', diagnosis:'Anemia falciforme', status:'aguardando_amostra' },
];
const { data: insertedReqs } = await sb.from('transfusion_requests').insert(reqs).select();
console.log('✓ requests', insertedReqs?.length);
console.log('Done');
