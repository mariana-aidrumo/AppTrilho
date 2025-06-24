
"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useUserProfile } from "@/contexts/user-profile-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import type { MockUser } from "@/data/mock-data";
import { getUsers, addUser, deleteUser, updateUserRolesAndProfile } from "@/services/sox-service";

// Schema for adding a new user
const addUserSchema = z.object({
  email: z.string().email("Por favor, insira um e-mail válido."),
  name: z.string().min(2, "O nome é obrigatório."),
});
type AddUserFormValues = z.infer<typeof addUserSchema>;

export default function AccessManagementPage() {
  const { currentUser, isUserAdmin } = useUserProfile();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<MockUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userToDelete, setUserToDelete] = useState<MockUser | null>(null);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<AddUserFormValues>({
    resolver: zodResolver(addUserSchema),
  });

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
        const data = await getUsers();
        setUsers(data);
    } catch (error) {
        toast({ title: "Erro", description: "Falha ao carregar usuários.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isUserAdmin()) {
        fetchUsers();
    } else {
        setIsLoading(false);
    }
  }, [isUserAdmin, fetchUsers]);

  if (!isUserAdmin()) {
    return (
      <div className="space-y-6 w-full">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Esta página é destinada apenas para Administradores de Controles Internos.</p>
            <Button variant="outline" asChild className="mt-4">
              <Link href="/sox-matrix">
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Painel
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleAddUser: SubmitHandler<AddUserFormValues> = async (data) => {
    if (users.some(u => u.email === data.email)) {
      toast({
        title: "Erro",
        description: "Um usuário com este e-mail já existe.",
        variant: "destructive",
      });
      return;
    }
    
    try {
        await addUser({ name: data.name, email: data.email });
        toast({
          title: "Usuário Adicionado",
          description: `${data.name} foi adicionado como Dono do Controle.`,
        });
        reset();
        fetchUsers(); // Refresh the list
    } catch(error) {
        toast({ title: "Erro", description: "Não foi possível adicionar o usuário.", variant: "destructive" });
    }
  };

  const handleToggleRole = async (userId: string, role: 'admin' | 'control-owner') => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    // Prevent removing the last admin
    if (role === 'admin' && user.roles.includes('admin')) {
        const adminCount = users.filter(u => u.roles.includes('admin')).length;
        if (adminCount <= 1) {
            toast({ title: "Ação não permitida", description: "Não é possível remover o último administrador.", variant: "destructive" });
            return;
        }
    }

    const newRoles = user.roles.includes(role)
        ? user.roles.filter(r => r !== role)
        : [...user.roles, role];
    
    if (newRoles.length === 0) {
        toast({ title: "Ação não permitida", description: "O usuário deve ter pelo menos um perfil.", variant: "destructive" });
        return;
    }
    
    const newActiveProfile = 
        (newRoles.includes('admin') ? "Administrador de Controles Internos" :
        (newRoles.includes('control-owner') ? "Dono do Controle" : user.activeProfile));

    try {
        await updateUserRolesAndProfile(userId, newRoles, newActiveProfile);
        fetchUsers(); // Refresh the list
    } catch(error) {
        toast({ title: "Erro", description: "Não foi possível atualizar o perfil do usuário.", variant: "destructive" });
    }
  };
  
  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    if (userToDelete.id === currentUser.id) {
       toast({ title: "Ação não permitida", description: "Você não pode remover a si mesmo.", variant: "destructive" });
       setUserToDelete(null);
       return;
    }
    
    try {
        await deleteUser(userToDelete.id);
        toast({
          title: "Usuário Removido",
          description: `${userToDelete.name} foi removido do sistema.`,
        });
        fetchUsers(); // Refresh the list
    } catch(error) {
        toast({ title: "Erro", description: "Não foi possível remover o usuário.", variant: "destructive" });
    } finally {
        setUserToDelete(null);
    }
  };

  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-screen">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="ml-2">Carregando gerenciamento de acessos...</p>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Adicionar Novo Usuário</CardTitle>
          <CardDescription>Conceda acesso a novos usuários fornecendo o nome e e-mail. Por padrão, eles receberão o perfil "Dono do Controle".</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(handleAddUser)}>
          <CardContent className="space-y-4">
             <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input id="name" {...register("name")} placeholder="João da Silva" />
                  {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" {...register("email")} placeholder="joao.silva@empresa.com" />
                  {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
                </div>
             </div>
          </CardContent>
          <CardFooter>
            <Button type="submit">
              <UserPlus className="mr-2 h-4 w-4" />
              Adicionar Usuário
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gerenciar Acessos</CardTitle>
          <CardDescription>Adicione ou remova perfis para os usuários existentes. Um usuário deve ter pelo menos um perfil.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Administrador</TableHead>
                  <TableHead>Dono do Controle</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Checkbox
                        id={`admin-role-${user.id}`}
                        checked={user.roles.includes('admin')}
                        onCheckedChange={() => handleToggleRole(user.id, 'admin')}
                        disabled={user.id === currentUser.id && user.roles.filter(r => r === 'admin').length === 1 && users.filter(u => u.roles.includes('admin')).length === 1}
                      />
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        id={`owner-role-${user.id}`}
                        checked={user.roles.includes('control-owner')}
                        onCheckedChange={() => handleToggleRole(user.id, 'control-owner')}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                       <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setUserToDelete(user)} disabled={user.id === currentUser.id}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                              <span className="sr-only">Remover</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. Isso removerá permanentemente o usuário <strong>{userToDelete?.name}</strong> e todos os seus acessos.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={confirmDeleteUser}>Confirmar Remoção</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
