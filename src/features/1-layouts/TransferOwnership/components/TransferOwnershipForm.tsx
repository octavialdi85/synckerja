import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/features/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/features/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/features/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/features/ui/select";
import { Input } from "@/features/ui/input";
import { Textarea } from "@/features/ui/textarea";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/features/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/features/ui/popover";
import { Crown, AlertTriangle, Mail, Loader2, Users, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "@/features/1-login/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAppTranslation } from "@/features/share/i18n/useAppTranslation";

type TransferFormValues = {
  transferMethod: "member" | "email";
  newOwnerId?: string;
  targetEmail?: string;
  message?: string;
};

interface Member {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
}

interface TransferOwnershipFormProps {
  members: Member[];
  onTransferComplete: () => void;
  initiateTransfer: (toUserId: string, message?: string) => Promise<boolean>;
  initiateEmailTransfer?: (email: string, message?: string) => Promise<boolean>;
  loading: boolean;
  membersLoading?: boolean;
}

const TransferOwnershipForm = ({ 
  members, 
  onTransferComplete, 
  initiateTransfer, 
  initiateEmailTransfer,
  loading,
  membersLoading = false
}: TransferOwnershipFormProps) => {
  const { t } = useAppTranslation();
  const [isConfirming, setIsConfirming] = useState(false);
  const [openCombobox, setOpenCombobox] = useState(false);

  const transferSchema = useMemo(
    () =>
      z
        .object({
          transferMethod: z.enum(["member", "email"]),
          newOwnerId: z.string().optional(),
          targetEmail: z
            .union([
              z.string().email(t("transferOwnership.form.validation.emailInvalid", "Invalid email")),
              z.literal(""),
            ])
            .optional(),
          message: z.string().optional(),
        })
        .refine(
          (data) => {
            if (data.transferMethod === "member" && !data.newOwnerId) {
              return false;
            }
            if (data.transferMethod === "email" && !data.targetEmail) {
              return false;
            }
            return true;
          },
          {
            message: t(
              "transferOwnership.form.validation.pickTarget",
              "Select a member or enter a target email",
            ),
            path: ["newOwnerId"],
          },
        ),
    [t],
  );

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      transferMethod: members.length > 0 ? "member" : "email",
      message: "",
    },
  });

  // Filter out current owner (role = 'owner') from the list
  const eligibleMembers = members.filter(member => member.role !== 'owner');
  const watchTransferMethod = form.watch("transferMethod");
  const watchTargetEmail = form.watch("targetEmail");

  // Filter members based on search input
  const filteredMembers = eligibleMembers.filter(member => 
    member.full_name.toLowerCase().includes((watchTargetEmail || "").toLowerCase()) ||
    member.email.toLowerCase().includes((watchTargetEmail || "").toLowerCase())
  );

  console.log('TransferOwnershipForm - members:', members);
  console.log('TransferOwnershipForm - eligibleMembers:', eligibleMembers);
  console.log('TransferOwnershipForm - membersLoading:', membersLoading);

  const onSubmit = async (values: TransferFormValues) => {
    if (!isConfirming) {
      setIsConfirming(true);
      return;
    }

    // Make sure members are loaded before proceeding
    if (membersLoading) {
      toast({
        title: t("transferOwnership.toast.warning.title", "Warning"),
        description: t(
          "transferOwnership.toast.warning.membersLoading",
          "Member data is still loading. Please wait.",
        ),
        variant: "destructive",
      });
      setIsConfirming(false);
      return;
    }

    let success = false;
    
    if (values.transferMethod === "member" && values.newOwnerId) {
      console.log('Using member transfer for user ID:', values.newOwnerId);
      success = await initiateTransfer(values.newOwnerId, values.message || undefined);
    } else if (values.transferMethod === "email" && values.targetEmail) {
      // Check if email exists in members first
      console.log('Checking if email exists in members:', values.targetEmail);
      console.log('Available members:', eligibleMembers);
      
      const memberByEmail = eligibleMembers.find(m => m.email === values.targetEmail);
      console.log('Found member by email:', memberByEmail);
      
      if (memberByEmail) {
        console.log('Email found in members, using member transfer instead:', memberByEmail);
        success = await initiateTransfer(memberByEmail.user_id, values.message || undefined);
      } else {
        // Only use email transfer if user is not a member
        if (initiateEmailTransfer) {
          console.log('Email not found in members, initiating email transfer to:', values.targetEmail);
          success = await initiateEmailTransfer(values.targetEmail, values.message || undefined);
        } else {
          toast({
            title: t("transferOwnership.toast.error.title", "Error"),
            description: t(
              "transferOwnership.toast.error.emailNotMember",
              "That email is not an organization member. The user must join the organization first.",
            ),
            variant: "destructive",
          });
          setIsConfirming(false);
          return;
        }
      }
    }
    
    if (success) {
      onTransferComplete();
      setIsConfirming(false);
      form.reset();
    } else {
      setIsConfirming(false);
    }
  };

  const handleCancel = () => {
    setIsConfirming(false);
  };

  const getSelectedTarget = () => {
    const values = form.getValues();
    if (values.transferMethod === "member" && values.newOwnerId) {
      return eligibleMembers.find(m => m.user_id === values.newOwnerId);
    } else if (values.transferMethod === "email" && values.targetEmail) {
      // Check if email is a member first
      const memberByEmail = eligibleMembers.find(m => m.email === values.targetEmail);
      if (memberByEmail) {
        return memberByEmail;
      }
      return {
        full_name: t("transferOwnership.form.externalUserFallback", "User"),
        email: values.targetEmail,
      };
    }
    return null;
  };

  // Show loading while members are being fetched
  if (membersLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-600" />
            {t("transferOwnership.form.title", "Transfer ownership")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>
              {t("transferOwnership.form.loadingMembers", "Loading organization members…")}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show informative message if no eligible members
  if (eligibleMembers.length === 0 && !membersLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-600" />
            {t("transferOwnership.form.title", "Transfer ownership")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Users className="h-12 w-12 text-gray-400" />
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {t("transferOwnership.form.noEligibleTitle", "No eligible members")}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {t(
                  "transferOwnership.form.noEligibleBody",
                  "There are no other members who can receive ownership.",
                )}
              </p>
            </div>
            <div className="w-full max-w-md">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="targetEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {t("transferOwnership.form.emailTarget", "Target email")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder={t(
                              "transferOwnership.form.emailPlaceholderMember",
                              "Enter the new owner's email",
                            )}
                            {...field}
                          />
                        </FormControl>
                        <p className="text-xs text-gray-500">
                          {t(
                            "transferOwnership.form.emailMustBeMemberHint",
                            "Email must belong to an active member.",
                          )}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("transferOwnership.form.messageOptional", "Message (optional)")}
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t(
                              "transferOwnership.form.messagePlaceholder",
                              "Add a message for the new owner…",
                            )}
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-yellow-600 hover:bg-yellow-700"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {t("transferOwnership.form.processing", "Processing…")}
                      </>
                    ) : (
                      t("transferOwnership.form.transferViaEmail", "Transfer via email")
                    )}
                  </Button>
                </form>
              </Form>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-yellow-600" />
          {isConfirming
            ? t("transferOwnership.form.confirmTitle", "Confirm transfer ownership")
            : t("transferOwnership.form.title", "Transfer ownership")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isConfirming ? (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    {t("transferOwnership.form.warningTitle", "Important warning")}
                  </h3>
                  <p className="mt-1 text-sm text-yellow-700">
                    {t(
                      "transferOwnership.form.warningBody",
                      "After transferring ownership, you will lose owner access and cannot undo this.",
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                {t("transferOwnership.form.targetLabel", "Transfer target:")}
              </p>
              <div className="bg-gray-50 rounded-lg p-3">
                {(() => {
                  const target = getSelectedTarget();
                  return target ? (
                    <div>
                      <p className="font-medium">{target.full_name}</p>
                      <p className="text-sm text-gray-600">{target.email}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      {t("transferOwnership.form.targetNotFound", "Target not found")}
                    </p>
                  );
                })()}
              </div>
            </div>

            {form.getValues("message") && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  {t("transferOwnership.form.messageLabel", "Message:")}
                </p>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm">{form.getValues("message")}</p>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={loading}
                className="flex-1"
              >
                {t("transferOwnership.form.cancel", "Cancel")}
              </Button>
              <Button
                onClick={() => onSubmit(form.getValues())}
                disabled={loading}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t("transferOwnership.form.processing", "Processing…")}
                  </>
                ) : (
                  t("transferOwnership.form.confirmYes", "Yes, transfer ownership")
                )}
              </Button>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="transferMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("transferOwnership.form.methodLabel", "Transfer method")}
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t(
                              "transferOwnership.form.methodPlaceholder",
                              "Choose a transfer method",
                            )}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {eligibleMembers.length > 0 && (
                          <SelectItem value="member">
                            {t("transferOwnership.form.methodMember", "{{count}} members available", {
                              count: eligibleMembers.length,
                            })}
                          </SelectItem>
                        )}
                        <SelectItem value="email">
                          {t(
                            "transferOwnership.form.methodEmailAutocomplete",
                            "Transfer via email with autocomplete",
                          )}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchTransferMethod === "member" && eligibleMembers.length > 0 && (
                <FormField
                  control={form.control}
                  name="newOwnerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("transferOwnership.form.pickNewOwner", "Choose new owner")}
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t(
                                "transferOwnership.form.pickMemberPlaceholder",
                                "Select a member to become the new owner",
                              )}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {eligibleMembers.map((member) => (
                            <SelectItem key={member.user_id} value={member.user_id}>
                              <div className="flex flex-col">
                                <span>{member.full_name}</span>
                                <span className="text-xs text-gray-500">
                                  {member.email} • {member.role}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {watchTransferMethod === "email" && (
                <FormField
                  control={form.control}
                  name="targetEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {t(
                          "transferOwnership.form.emailAutocompleteLabel",
                          "Target email with autocomplete",
                        )}
                      </FormLabel>
                      <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openCombobox}
                              className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ||
                                t(
                                  "transferOwnership.form.comboboxPlaceholder",
                                  "Type a member name or email…",
                                )}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput
                              placeholder={t(
                                "transferOwnership.form.searchPlaceholder",
                                "Search by name or email…",
                              )}
                              value={field.value}
                              onValueChange={(value) => {
                                field.onChange(value);
                              }}
                            />
                            <CommandList>
                              <CommandEmpty>
                                {field.value && field.value.includes("@")
                                  ? t(
                                      "transferOwnership.form.commandEmptyWillEmail",
                                      "No member found; transfer will be sent by email",
                                    )
                                  : t(
                                      "transferOwnership.form.commandEmpty",
                                      "No members found",
                                    )}
                              </CommandEmpty>
                              {filteredMembers.length > 0 && (
                                <CommandGroup>
                                  {filteredMembers.map((member) => (
                                    <CommandItem
                                      key={member.user_id}
                                      value={member.email}
                                      onSelect={(value) => {
                                        field.onChange(value);
                                        setOpenCombobox(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          field.value === member.email ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <div className="flex flex-col">
                                        <span className="font-medium">{member.full_name}</span>
                                        <span className="text-xs text-gray-500">
                                          {member.email} • {member.role}
                                        </span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <p className="text-xs text-gray-500">
                        {t(
                          "transferOwnership.form.emailFieldHint",
                          "Search organization members or enter a new email address.",
                        )}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pesan (Opsional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tambahkan pesan untuk owner baru..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={loading || membersLoading}
                className="w-full bg-yellow-600 hover:bg-yellow-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t("transferOwnership.form.processing", "Processing…")}
                  </>
                ) : (
                  t("transferOwnership.form.continue", "Continue")
                )}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
};

export default TransferOwnershipForm;
