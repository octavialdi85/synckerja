
import { Label } from "@/features/ui/label";

interface OrganizationMember {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
}

interface OrganizationMembersListProps {
  members: OrganizationMember[];
  onMemberSelect: (email: string) => void;
}

const OrganizationMembersList = ({ members, onMemberSelect }: OrganizationMembersListProps) => {
  if (members.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <Label className="text-sm font-medium text-gray-700 mb-3 block">
        Anggota Organisasi yang Dapat Menerima Transfer:
      </Label>
      <div className="space-y-2 max-h-32 overflow-y-auto border rounded-lg p-2">
        {members.map((member) => (
          <div 
            key={member.user_id} 
            className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
            onClick={() => onMemberSelect(member.email)}
          >
            <div>
              <p className="text-sm font-medium">{member.full_name}</p>
              <p className="text-xs text-gray-500">{member.email}</p>
            </div>
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
              {member.role}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrganizationMembersList;
