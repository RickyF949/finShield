import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, Users, Plus, Mail, Phone, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { FamilyMember } from "@shared/schema";

const familyMemberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  relationship: z.string().min(1, "Relationship is required"),
  email: z.string().email("Valid email is required"),
  phoneNumber: z.string().optional(),
  receiveAlerts: z.boolean().default(true),
  alertTypes: z.array(z.string()).default(["suspicious_transaction"])
});

type FamilyMemberForm = z.infer<typeof familyMemberSchema>;

export default function ManageConnections() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const { toast } = useToast();

  const { data: familyMembers = [], isLoading } = useQuery({
    queryKey: ["/api/family-members/1"], // Using user ID 1 for demo
  });

  const form = useForm<FamilyMemberForm>({
    resolver: zodResolver(familyMemberSchema),
    defaultValues: {
      name: "",
      relationship: "",
      email: "",
      phoneNumber: "",
      receiveAlerts: true,
      alertTypes: ["suspicious_transaction"]
    }
  });

  const createMemberMutation = useMutation({
    mutationFn: (data: FamilyMemberForm) =>
      apiRequest("POST", "/api/family-members", { ...data, userId: 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family-members/1"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Family member added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add family member",
        variant: "destructive",
      });
    }
  });

  const updateMemberMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<FamilyMemberForm> }) =>
      apiRequest("PATCH", `/api/family-members/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family-members/1"] });
      setIsDialogOpen(false);
      setEditingMember(null);
      form.reset();
      toast({
        title: "Success",
        description: "Family member updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update family member",
        variant: "destructive",
      });
    }
  });

  const deleteMemberMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/family-members/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family-members/1"] });
      toast({
        title: "Success",
        description: "Family member removed successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove family member",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: FamilyMemberForm) => {
    if (editingMember) {
      updateMemberMutation.mutate({ id: editingMember.id, data });
    } else {
      createMemberMutation.mutate(data);
    }
  };

  const handleEdit = (member: FamilyMember) => {
    setEditingMember(member);
    form.reset({
      name: member.name,
      relationship: member.relationship,
      email: member.email,
      phoneNumber: member.phoneNumber || "",
      receiveAlerts: member.receiveAlerts || true,
      alertTypes: member.alertTypes || ["suspicious_transaction"]
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to remove this family member?")) {
      deleteMemberMutation.mutate(id);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase();
  };

  const alertTypeOptions = [
    { id: "suspicious_transaction", label: "Suspicious Transactions" },
    { id: "bill_reminder", label: "Bill Reminders" },
    { id: "unusual_spending", label: "Unusual Spending" },
    { id: "security_notice", label: "Security Notices" }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-xl text-gray-600">Loading family connections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/dashboard">
            <Button variant="outline" className="mb-4 text-lg">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Users className="text-green-600 mr-3 h-8 w-8" />
                Manage Family Connections
              </h1>
              <p className="text-xl text-gray-600 mt-2">
                Add trusted family members who will receive alerts about your account activity
              </p>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-green-600 text-white text-lg px-6 py-3 hover:bg-green-700"
                  onClick={() => {
                    setEditingMember(null);
                    form.reset();
                  }}
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add Family Member
                </Button>
              </DialogTrigger>
              
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-2xl">
                    {editingMember ? "Edit Family Member" : "Add Family Member"}
                  </DialogTitle>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-lg">Full Name</FormLabel>
                          <FormControl>
                            <Input {...field} className="text-lg p-3" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="relationship"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-lg">Relationship</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="text-lg p-3">
                                <SelectValue placeholder="Select relationship" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Spouse">Spouse</SelectItem>
                              <SelectItem value="Son">Son</SelectItem>
                              <SelectItem value="Daughter">Daughter</SelectItem>
                              <SelectItem value="Sibling">Sibling</SelectItem>
                              <SelectItem value="Friend">Trusted Friend</SelectItem>
                              <SelectItem value="Caregiver">Caregiver</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-lg">Email Address</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" className="text-lg p-3" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-lg">Phone Number (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} type="tel" className="text-lg p-3" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="receiveAlerts"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-lg">
                              Receive Alert Notifications
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="alertTypes"
                      render={() => (
                        <FormItem>
                          <div className="mb-4">
                            <FormLabel className="text-lg">Alert Types</FormLabel>
                          </div>
                          {alertTypeOptions.map((item) => (
                            <FormField
                              key={item.id}
                              control={form.control}
                              name="alertTypes"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={item.id}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(item.id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, item.id])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== item.id
                                                )
                                              );
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-lg font-normal">
                                      {item.label}
                                    </FormLabel>
                                  </FormItem>
                                );
                              }}
                            />
                          ))}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex space-x-4">
                      <Button
                        type="submit"
                        disabled={createMemberMutation.isPending || updateMemberMutation.isPending}
                        className="flex-1 bg-green-600 text-white text-lg py-3 hover:bg-green-700"
                      >
                        {(createMemberMutation.isPending || updateMemberMutation.isPending) 
                          ? "Saving..." 
                          : editingMember 
                            ? "Update Member" 
                            : "Add Member"
                        }
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsDialogOpen(false);
                          setEditingMember(null);
                          form.reset();
                        }}
                        className="flex-1 text-lg py-3"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {familyMembers.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-2xl font-semibold text-gray-600 mb-2">
                No Family Connections Yet
              </h3>
              <p className="text-xl text-gray-500 mb-6">
                Add trusted family members to keep them informed about your account security
              </p>
              <Button 
                onClick={() => setIsDialogOpen(true)}
                className="bg-green-600 text-white text-lg px-6 py-3 hover:bg-green-700"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Your First Family Member
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {familyMembers.map((member: FamilyMember) => (
              <Card key={member.id} className="border-2 border-gray-200 hover:border-green-600 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-xl">
                          {getInitials(member.name)}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="text-2xl font-semibold">{member.name}</h3>
                        <p className="text-xl text-gray-600">{member.relationship}</p>
                        
                        <div className="flex items-center space-x-6 text-lg text-gray-600">
                          <div className="flex items-center">
                            <Mail className="h-5 w-5 mr-2" />
                            {member.email}
                          </div>
                          {member.phoneNumber && (
                            <div className="flex items-center">
                              <Phone className="h-5 w-5 mr-2" />
                              {member.phoneNumber}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-lg">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            member.receiveAlerts 
                              ? "bg-green-100 text-green-800" 
                              : "bg-gray-100 text-gray-600"
                          }`}>
                            {member.receiveAlerts ? "Receiving Alerts" : "Alerts Disabled"}
                          </span>
                          
                          {member.alertTypes && member.alertTypes.length > 0 && (
                            <span className="text-gray-600">
                              {member.alertTypes.length} alert type{member.alertTypes.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-3">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => handleEdit(member)}
                        className="text-lg p-3"
                      >
                        <Edit2 className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => handleDelete(member.id)}
                        disabled={deleteMemberMutation.isPending}
                        className="text-lg p-3 text-red-600 border-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}