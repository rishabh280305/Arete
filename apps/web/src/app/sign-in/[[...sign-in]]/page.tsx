import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="clerkPage">
      <div className="brand clerkBrand">
        <div className="brandMark">A</div>
        <strong>Arete</strong>
      </div>
      <SignIn />
    </main>
  );
}
