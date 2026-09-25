import React from 'react';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
const mocks=vi.hoisted(()=>({invoke:vi.fn(),toast:vi.fn(),admin:true,navigate:vi.fn()}));
vi.mock('react-router-dom',()=>({useNavigate:()=>mocks.navigate}));
vi.mock('@/hooks/useUserRole',()=>({useUserRole:()=>({isSuperAdmin:mocks.admin,loading:false})}));
vi.mock('@/hooks/use-toast',()=>({toast:mocks.toast}));
vi.mock('@/components/admin/EmailMonitoringDashboard',()=>({EmailMonitoringDashboard:()=>null}));
vi.mock('@/components/admin/IntegrationsHub',()=>({default:()=>null}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:mocks.invoke},from:(table:string)=>{
  const data=table==='profiles'?[{id:'synthetic-id',full_name:'Conta de Teste'}]:table==='subscriptions'?[{id:'subscription',user_id:'synthetic-id',status:'active',plan:'pro'}]:[];
  const result={data,count:data.length,error:null};
  const query:any={then:(ok:any)=>Promise.resolve(result).then(ok)};
  for(const name of ['select','eq','is','not','gt','lt','order','limit'])query[name]=()=>query;
  return query;
}}}));
import SuperAdmin from './pages/SuperAdmin';
beforeEach(()=>{vi.clearAllMocks();mocks.admin=true;vi.stubGlobal('ResizeObserver',class{observe(){}unobserve(){}disconnect(){}});mocks.invoke.mockResolvedValue({data:{users:[{id:'synthetic-id',email:'teste@example.invalid'}]},error:null});});
afterEach(cleanup);
it('shows account email below the matching subscription name',async()=>{
 render(<SuperAdmin/>);await waitFor(()=>expect(mocks.invoke).toHaveBeenCalledWith('admin-account-emails',{body:{userIds:['synthetic-id']}}));
 fireEvent.click(screen.getByText('Assinaturas'));
 expect(await screen.findByText('teste@example.invalid')).toBeTruthy();expect(screen.getByText('Conta de Teste')).toBeTruthy();
});
it('keeps subscriptions available when email lookup fails',async()=>{
 mocks.invoke.mockResolvedValue({data:null,error:{message:'denied'}});render(<SuperAdmin/>);await waitFor(()=>expect(mocks.toast).toHaveBeenCalled());
 fireEvent.click(screen.getByText('Assinaturas'));expect(await screen.findByText('E-mail indisponível')).toBeTruthy();expect(screen.getByText('Conta de Teste')).toBeTruthy();
});
it('does not request account emails for a non-admin',async()=>{
 mocks.admin=false;render(<SuperAdmin/>);await waitFor(()=>expect(mocks.navigate).toHaveBeenCalledWith('/dashboard'));expect(mocks.invoke).not.toHaveBeenCalled();
});
