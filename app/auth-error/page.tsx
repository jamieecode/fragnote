import Link from "next/link";
import { pageStyle, centeredMessageStyle, primaryButtonStyle } from "@/lib/ui-styles";

export default function AuthErrorPage() {
  return (
    <div style={pageStyle}>
      <div style={centeredMessageStyle}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 8 }}>로그인에 실패했어요</div>
          <div style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>
            이메일 제공에 동의하지 않으셨거나 로그인 중 문제가 발생했어요.
            <br />
            다시 시도해주세요.
          </div>
        </div>
        <Link href="/" style={{ ...primaryButtonStyle, textDecoration: "none", display: "inline-block" }}>
          로그인 화면으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
