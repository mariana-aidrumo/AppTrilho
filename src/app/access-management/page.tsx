
"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useUserProfile } from "@/contexts/user-profile-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Trash2, ArrowLeft, Loader2, ChevronsUpDown, Check } from "lucide-react";
import Link from "next/link";
import type { MockUser, TenantUser } from "@/data/mock-data";
// REMOVED: Service imports for user management
// import { getUsers, addUser, deleteUser, updateUserRolesAndProfile, getTenantUsers } from "@/services/sox-service";
import { getTenantUsers } from "@/services/sox-service";
import { cn } from "@/lib/utils";


// Schema for adding a new user
const addUserSchema = z.object({
  email: z.string().email("Por favor, selecione um usuário válido."),
  name: z.string().min(2, "Por favor, selecione um usuário válido."),
});
type AddUserFormValues = z.infer<typeof addUserSchema>;

export default function AccessManagementPage() {
  // Use the centralized state and functions from the context
  const { currentUser, isUserAdmin, allUsers, addUser, deleteUser, updateUserRolesAndProfile } = useUserProfile();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<MockUser[]>(allUsers);
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearchingTenants, setIsSearchingTenants] = useState(false);
  const [userToDelete, setUserToDelete] = useState<MockUser | null>(null);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [selectedTenantUser, setSelectedTenantUser] = useState<TenantUser | null>(null);
  const [searchQuery, setSearchQuery] = useState("");


  const { handleSubmit, formState: { errors }, reset, setValue } = useForm<AddUserFormValues>({
    resolver: zodResolver(addUserSchema),
  });

  // This effect will now react to changes in the centralized 'allUsers' state
  useEffect(() => {
    if (isUserAdmin()) {
        setUsers(allUsers);
        setIsLoading(false);
    } else {
        setIsLoading(false);
    }
  }, [isUserAdmin, allUsers]);

  // Debounced search effect for Tenant Users
  useEffect(() => {
    if (searchQuery.length < 3) {
      setTenantUsers([]);
      return;
    }

    setIsSearchingTenants(true);
    const handler = setTimeout(async () => {
      try {
        const tenantData = await getTenantUsers(searchQuery);
        setTenantUsers(tenantData);
      } catch (error) {
        toast({ title: "Erro de Integração", description: "Não foi possível buscar usuários do diretório.", variant: "destructive" });
      } finally {
        setIsSearchingTenants(false);
      }
    }, 500); // 500ms debounce delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery, toast]);

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
    // Check against the stateful 'users' list
    if (users.some(u => u.email === data.email)) {
      toast({
        title: "Erro",
        description: "Um usuário com este e-mail já existe no sistema.",
        variant: "destructive",
      });
      return;
    }
    
    try {
        // Use the context function
        await addUser({ name: data.name, email: data.email });
        toast({
          title: "Usuário Adicionado",
          description: `${data.name} foi adicionado como Dono do Controle.`,
        });
        reset();
        setSelectedTenantUser(null);
        // No need to fetch, the state will update automatically via context
    } catch(error) {
        toast({ title: "Erro", description: "Não foi possível adicionar o usuário.", variant: "destructive" });
    }
  };

  const handleToggleRole = async (userId: string, role: 'admin' | 'control-owner') => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

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
        // Use the context function
        await updateUserRolesAndProfile(userId, newRoles, newActiveProfile);
        // No need to fetch, state updates automatically
    } catch(error) {
        toast({ title: "Erro", description: "Não foi possível atualizar o perfil do usuário.", variant: "destructive" });
    }
  };
  
  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    if (userToDelete.id === currentUser!.id) {
       toast({ title: "Ação não permitida", description: "Você não pode remover a si mesmo.", variant: "destructive" });
       setUserToDelete(null);
       return;
    }
    
    try {
        // Use the context function
        await deleteUser(userToDelete.id);
        toast({
          title: "Usuário Removido",
          description: `${userToDelete.name} foi removido do sistema.`,
        });
        // No need to fetch
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
          <CardDescription>Busque e selecione um usuário do diretório da empresa para conceder acesso. Por padrão, eles receberão o perfil "Dono do Controle".</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(handleAddUser)}>
          <CardContent className="space-y-4">
             <div>
              <Label htmlFor="user-search">Buscar Usuário</Label>
              <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id="user-search"
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between font-normal"
                    >
                        {selectedTenantUser ? `${selectedTenantUser.name} (${selectedTenantUser.email})` : "Selecione um usuário..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                        <CommandInput 
                            placeholder="Pesquisar por nome ou e-mail (mín. 3)..." 
                            onValueChange={setSearchQuery}
                            value={searchQuery}
                        />
                        <CommandList>
                            {isSearchingTenants && <div className="p-4 text-sm text-center">Buscando...</div>}
                            {!isSearchingTenants && tenantUsers.length === 0 && searchQuery.length >= 3 && <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>}
                            <CommandGroup>
                                {tenantUsers.map(user => (
                                    <CommandItem
                                        key={user.id}
                                        value={`${user.name} ${user.email}`}
                                        onSelect={() => {
                                            setSelectedTenantUser(user);
                                            setValue('name', user.name, { shouldValidate: true });
                                            setValue('email', user.email, { shouldValidate: true });
                                            setComboboxOpen(false);
                                        }}
                                    >
                                        <Check className={cn("mr-2 h-4 w-4", selectedTenantUser?.id === user.id ? "opacity-100" : "opacity-0")} />
                                        <div className="flex flex-col">
                                          <span className="text-sm">{user.name}</span>
                                          <span className="text-xs text-muted-foreground">{user.email}</span>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
              </Popover>
              {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
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
                        disabled={user.id === currentUser!.id && user.roles.filter(r => r === 'admin').length === 1 && users.filter(u => u.roles.includes('admin')).length === 1}
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
                            <Button variant="ghost" size="icon" onClick={() => setUserToDelete(user)} disabled={user.id === currentUser!.id}>
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
