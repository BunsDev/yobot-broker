import { Navbar, Main, GradientContainer, AppPageMain } from "src/components";

const App = () => (
  <GradientContainer>
    <Main>
      <Navbar accountButton={true} />
      <AppPageMain />
    </Main>
  </GradientContainer>
);

export default App;
