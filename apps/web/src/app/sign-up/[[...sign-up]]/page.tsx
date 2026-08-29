import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="clerkPage">
      <div className="brand clerkBrand">
        <div className="brandMark">A</div>
        <strong>Arete</strong>
      </div>
      <SignUp />
    </main>
  );
}
