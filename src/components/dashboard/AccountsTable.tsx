import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

const accountsData = [
  {
    id: "1",
    program: "LATAM Pass",
    account: "**** 4521",
    balance: "250.000",
    status: "active",
  },
  {
    id: "2",
    program: "Smiles",
    account: "**** 8732",
    balance: "180.000",
    status: "active",
  },
  {
    id: "3",
    program: "TudoAzul",
    account: "**** 2941",
    balance: "95.000",
    status: "active",
  },
  {
    id: "4",
    program: "Livelo",
    account: "**** 6583",
    balance: "320.000",
    status: "active",
  },
  {
    id: "5",
    program: "Esfera",
    account: "**** 1247",
    balance: "0",
    status: "inactive",
  },
];

export const AccountsTable = () => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Programa</TableHead>
          <TableHead>Conta</TableHead>
          <TableHead>Saldo</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {accountsData.map((account) => (
          <TableRow key={account.id}>
            <TableCell className="font-medium">{account.program}</TableCell>
            <TableCell>{account.account}</TableCell>
            <TableCell className="font-semibold">{account.balance} pts</TableCell>
            <TableCell>
              <Badge variant={account.status === "active" ? "default" : "secondary"}>
                {account.status === "active" ? "Ativa" : "Inativa"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
